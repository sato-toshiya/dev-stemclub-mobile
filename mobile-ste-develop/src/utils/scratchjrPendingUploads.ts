import { Platform } from "react-native"
import NetInfo from "@react-native-community/netinfo"
import axios from "axios"
import * as FileSystem from "expo-file-system"

import type { ProjectItem, ProjectUploadResponse } from "@/client"
import Config from "@/config/config.dev"
import { hasInternetConnection } from "@/utils/network"
import {
  removeOfflineProject,
  removeOfflineProjectByTitle,
  upsertOfflineProjectDetail,
} from "@/utils/offlineSync"
import { load, save } from "@/utils/storage"

export const PENDING_UPLOAD_QUEUE_KEY = "scratchjr.pending-upload-queue.v1"

export type PendingProjectUpload = {
  createdAt: number
  localFileName: string
  projectId: ProjectItem["documentId"] | null
  syncKey: string
  thumbnailFileName?: string | null
  title: string
}


export function getPendingUploads(): PendingProjectUpload[] {
  const queue = load<PendingProjectUpload[]>(PENDING_UPLOAD_QUEUE_KEY)
  return Array.isArray(queue) ? queue : []
}

export function savePendingUploads(queue: PendingProjectUpload[]) {
  save(PENDING_UPLOAD_QUEUE_KEY, queue)
}

export function cleanupDocumentFileByName(localFileName: string) {
  try {
    const docFile = new FileSystem.File(FileSystem.Paths.document, localFileName)
    if (docFile.exists) {
      docFile.delete()
    }
  } catch {}
}

export function upsertPendingUpload(item: Omit<PendingProjectUpload, "createdAt" | "syncKey">) {
  const syncKey = item.projectId ? `project:${item.projectId}` : `title:${item.title}`
  const queue = getPendingUploads()
  const existingIndex = queue.findIndex((entry) => entry.syncKey === syncKey)

  if (existingIndex >= 0) {
    const previous = queue[existingIndex]
    queue[existingIndex] = {
      ...item,
      createdAt: Date.now(),
      syncKey,
    }

    if (previous.localFileName !== item.localFileName) {
      cleanupDocumentFileByName(previous.localFileName)
    }

    if (previous.thumbnailFileName && previous.thumbnailFileName !== item.thumbnailFileName) {
      cleanupDocumentFileByName(previous.thumbnailFileName)
    }
  } else {
    queue.push({
      ...item,
      createdAt: Date.now(),
      syncKey,
    })
  }

  savePendingUploads(queue)
}

export function resolvePendingProjectLocalUri(input: {
  projectId?: ProjectItem["documentId"] | null
  title?: string | null
}): string | undefined {
  if (Platform.OS === "web") {
    return undefined
  }

  const queue = getPendingUploads()
  if (!queue.length) {
    return undefined
  }

  const normalizedTitle = (input.title || "").trim().toLowerCase()

  const pendingItem =
    queue.find((entry) => input.projectId && entry.projectId === input.projectId) ||
    queue.find((entry) => normalizedTitle && entry.title.trim().toLowerCase() === normalizedTitle)

  if (!pendingItem) {
    return undefined
  }

  try {
    const localFile = new FileSystem.File(FileSystem.Paths.document, pendingItem.localFileName)
    if (localFile.exists) {
      return localFile.uri
    }
  } catch {
    return undefined
  }

  return undefined
}

export async function syncPendingUploads(token: string): Promise<number> {
  if (Platform.OS === "web" || !token) {
    return 0
  }

  const queue = getPendingUploads()
  if (!queue.length) {
    return 0
  }

  const online = await hasInternetConnection()
  if (!online) {
    return 0
  }

  let nextQueue = [...queue]
  let syncedCount = 0

  for (const item of queue) {
    const file = new FileSystem.File(FileSystem.Paths.document, item.localFileName)

    if (!file.exists) {
      nextQueue = nextQueue.filter((entry) => entry.syncKey !== item.syncKey)
      continue
    }

    const formData = new FormData()
    formData.append("title", item.title)
    formData.append("sjr_file", {
      uri: file.uri,
      type: "application/octet-stream",
      name: `${item.title}.sjr`,
    } as any)

    if (item.thumbnailFileName) {
      const thumbnailFile = new FileSystem.File(FileSystem.Paths.document, item.thumbnailFileName)
      if (thumbnailFile.exists) {
        formData.append("thumbnail", {
          uri: thumbnailFile.uri,
          type: "image/png",
          name: "thumbnail.png",
        } as any)
      }
    }

    try {
      let response: any
      if (item.projectId) {
        response = await axios.request({
          method: "put",
          maxBodyLength: Infinity,
          url: `${Config.API_URL}/projects/${item.projectId}/edit`,
          headers: {
            "accept": "application/json",
            "Authorization": `Bearer ${token}`,
            "Content-Type": "multipart/form-data",
          },
          data: formData,
        })
      } else {
        response = await axios.request({
          method: "post",
          maxBodyLength: Infinity,
          url: `${Config.API_URL}/projects/upload`,
          headers: {
            "accept": "application/json",
            "Authorization": `Bearer ${token}`,
            "Content-Type": "multipart/form-data",
          },
          data: formData,
        })
      }

      const uploadedProject = (response?.data as ProjectUploadResponse)?.data
      if (uploadedProject?.documentId) {
        // If it was an update to a local project (should not happen with current ScratchJrScreen login but for safety)
        if (item.projectId && item.projectId.startsWith("local-")) {
          removeOfflineProject(item.projectId)
        } else if (!item.projectId) {
          // If it was a new project, remove any matching local project in cache to avoid duplicates
          removeOfflineProjectByTitle(item.title)
        }

        upsertOfflineProjectDetail({
          currentProjectId: uploadedProject.documentId,
          localFileUri: `${FileSystem.documentDirectory}${item.localFileName}`,
          project: uploadedProject,
        })
      }

      syncedCount += 1
      nextQueue = nextQueue.filter((entry) => entry.syncKey !== item.syncKey)
      // Keep local files for now to avoid stale file:// pointers in offline cache
      // causing blank screens before the subsequent offline pull sync updates URLs.
      // Files can be cleaned by a dedicated housekeeping task later.
    } catch {
      const stillOnline = await hasInternetConnection()
      if (!stillOnline) {
        break
      }
    }
  }

  savePendingUploads(nextQueue)

  return syncedCount
}
