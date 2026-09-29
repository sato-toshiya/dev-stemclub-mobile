import { Platform } from "react-native"
import axios from "axios"
import * as FileSystem from "expo-file-system"

import {
  ClassAssignmentItemStudent,
  ClassMyItem,
  ProjectItem,
  getClassAssignmentsForStudent,
  getClassesMy,
  getProjectsMy,
} from "@/client"
import { load, save } from "@/utils/storage"
import { hasInternetConnection } from "@/utils/network"

const OFFLINE_PROJECTS_KEY = "offline.cache.projects.v1"
const OFFLINE_CLASSES_KEY = "offline.cache.classes.v1"
const OFFLINE_ASSIGNMENTS_KEY = "offline.cache.assignments.v1"
const OFFLINE_ASSET_MAP_KEY = "offline.cache.asset-map.v1"
const OFFLINE_LAST_SYNC_KEY = "offline.cache.last-sync.v1"

type AppRole = "teacher" | "student"

type OfflineAssetMap = Record<string, string>

type UpsertOfflineProjectParams = {
  currentProjectId?: ProjectItem["documentId"] | null
  localFileUri?: string
  project?: ProjectItem | null
  projectTitle?: string
  role?: AppRole
  thumbnailLocalUri?: string | null
}

let syncInProgress: Promise<void> | null = null

export function getCachedProjects(): ProjectItem[] {
  const cached = load<ProjectItem[]>(OFFLINE_PROJECTS_KEY)
  return Array.isArray(cached) ? cached : []
}

export function getCachedClasses(): ClassMyItem[] {
  const cached = load<ClassMyItem[]>(OFFLINE_CLASSES_KEY)
  return Array.isArray(cached) ? cached : []
}

export function getCachedAssignments(): ClassAssignmentItemStudent[] {
  const cached = load<ClassAssignmentItemStudent[]>(OFFLINE_ASSIGNMENTS_KEY)
  return Array.isArray(cached) ? cached : []
}

export function removeOfflineProject(documentId: string) {
  const cached = getCachedProjects()
  const next = cached.filter((p) => p.documentId !== documentId)
  if (next.length !== cached.length) {
    console.log(`[offlineSync] Removed project from cache by ID: ${documentId}`)
    save(OFFLINE_PROJECTS_KEY, next)
  }
}

export function removeOfflineProjectByTitle(title: string) {
  const cached = getCachedProjects()
  const normalizedTitle = title.trim().toLowerCase()
  // Only remove local projects (starting with local-) that match the title
  const next = cached.filter(
    (p) => !(p.title.trim().toLowerCase() === normalizedTitle && p.documentId.startsWith("local-")),
  )
  if (next.length !== cached.length) {
    console.log(`[offlineSync] Removed local project from cache by title: ${title}`)
    save(OFFLINE_PROJECTS_KEY, next)
  }
}

export function getLastOfflineSyncAt(): number | null {
  return load<number>(OFFLINE_LAST_SYNC_KEY)
}

function isExistingLocalFileUri(uri?: string | null): boolean {
  if (!uri || !uri.startsWith("file://")) {
    return false
  }

  try {
    const file = new FileSystem.File(uri)
    return file.exists
  } catch {
    return false
  }
}

/**
 * Merge fetched projects from server with cached projects
 * Preserves local file URIs if they exist in cache
 * @param fetchedProjects Projects from server
 * @param includeLocalOnly If true, appends projects that exist only in cache (not yet synced)
 */
export function mergeProjectsWithCache(
  fetchedProjects: ProjectItem[],
  includeLocalOnly = true,
): ProjectItem[] {
  const cached = getCachedProjects()
  const cachedMap = new Map(cached.map((p) => [p.documentId, p]))
  const fetchedIds = new Set(fetchedProjects.map((p) => p.documentId))
  const fetchedTitles = new Set(fetchedProjects.map((p) => p.title.trim().toLowerCase()))

  const merged = fetchedProjects.map((fetched) => {
    const cachedItem = cachedMap.get(fetched.documentId)

    // If no cached item, use fetched as-is
    if (!cachedItem) {
      return fetched
    }

    // Preserve local file URLs only when local files still exist.
    const cachedSjrUrl = cachedItem.sjr_file?.url
    const cachedThumbnailUrl = cachedItem.thumbnail?.url
    const hasUsableLocalSjr = isExistingLocalFileUri(cachedSjrUrl)
    const hasUsableLocalThumbnail = isExistingLocalFileUri(cachedThumbnailUrl)

    // If cached local files were deleted after upload sync, fallback to server URLs.
    const result: ProjectItem = {
      ...fetched,
      sjr_file: hasUsableLocalSjr
        ? ({
            ...fetched.sjr_file,
            url: cachedSjrUrl,
            name: cachedItem.sjr_file?.name || fetched.sjr_file?.name || `${fetched.title}.sjr`,
          } as ProjectItem["sjr_file"])
        : fetched.sjr_file,
      thumbnail: hasUsableLocalThumbnail
        ? ({
            ...fetched.thumbnail,
            url: cachedThumbnailUrl,
            name: cachedItem.thumbnail?.name || fetched.thumbnail?.name || "thumbnail.png",
          } as ProjectItem["thumbnail"])
        : fetched.thumbnail,
      // Always update timestamps and metadata from server
      updatedAt: fetched.updatedAt || cachedItem.updatedAt,
      createdAt: fetched.createdAt || cachedItem.createdAt,
    }

    return result
  })

  // Append projects that are ONLY in cache (pre-sync local projects)
  // CRITICAL: only include projects that start with 'local-' otherwise we duplicate server projects during pagination
  // ALSO: filter out local projects whose TITLE already exists in the fetched list (means they joined the server)
  const localOnly = includeLocalOnly
    ? cached.filter(
        (p) =>
          p.documentId.startsWith("local-") &&
          !fetchedIds.has(p.documentId) &&
          !fetchedTitles.has(p.title.trim().toLowerCase()),
      )
    : []

  const finalResults = [...localOnly, ...merged]

  // Sort by updatedAt descending (newest first)
  return finalResults.sort((a, b) => {
    const dateA = new Date(a.updatedAt || 0).getTime()
    const dateB = new Date(b.updatedAt || 0).getTime()
    return dateB - dateA
  })
}

export function upsertOfflineProjectDetail(params: UpsertOfflineProjectParams) {
  const cached = getCachedProjects()
  const nowIso = new Date().toISOString()

  const targetDocumentId = params.project?.documentId || params.currentProjectId || null
  let targetIndex = targetDocumentId
    ? cached.findIndex((item) => item.documentId === targetDocumentId)
    : -1

  if (targetIndex === -1) {
    const searchTitle = (params.project?.title || params.projectTitle || "").trim().toLowerCase()
    if (searchTitle) {
      targetIndex = cached.findIndex(
        (item) =>
          item.title.trim().toLowerCase() === searchTitle && item.documentId.startsWith("local-"),
      )
    }
  }

  const previous = targetIndex > -1 ? cached[targetIndex] : null
  const title = params.project?.title || params.projectTitle || previous?.title || "Untitled"

  const localSjrFile = params.localFileUri
    ? {
        ...(previous?.sjr_file ?? {}),
        ...(params.project?.sjr_file ?? {}),
        name: params.project?.sjr_file?.name || previous?.sjr_file?.name || `${title}.sjr`,
        url: params.localFileUri,
      }
    : params.project?.sjr_file || previous?.sjr_file

  const localThumbnail = params.thumbnailLocalUri
    ? {
        ...(previous?.thumbnail ?? {}),
        ...(params.project?.thumbnail ?? {}),
        name: params.project?.thumbnail?.name || previous?.thumbnail?.name || "thumbnail.png",
        url: params.thumbnailLocalUri,
      }
    : params.project?.thumbnail || previous?.thumbnail || null

  const mergedProject: ProjectItem = {
    ...(previous ?? ({} as ProjectItem)),
    ...(params.project ?? {}),
    id: params.project?.id || previous?.id || Date.now(),
    documentId:
      params.project?.documentId ||
      targetDocumentId ||
      previous?.documentId ||
      `local-${Date.now()}`,
    title,
    owner_type:
      params.project?.owner_type || previous?.owner_type || ((params.role || "student") as any),
    createdAt: params.project?.createdAt || previous?.createdAt || nowIso,
    updatedAt: params.project?.updatedAt || nowIso,
    sjr_file: (localSjrFile ||
      previous?.sjr_file ||
      ({} as ProjectItem["sjr_file"])) as ProjectItem["sjr_file"],
    thumbnail: localThumbnail as ProjectItem["thumbnail"],
  }

  const next = [...cached]
  if (targetIndex > -1) {
    next[targetIndex] = mergedProject
    console.log(`[offlineSync] Updated existing project: ${title} (${targetDocumentId})`)
  } else {
    next.unshift(mergedProject)
    console.log(`[offlineSync] Inserted new project: ${title} (${mergedProject.documentId})`)
  }
  
  console.log(`[offlineSync] Saving project list of size: ${next.length}`)
  save(OFFLINE_PROJECTS_KEY, next)
}

export function resolveOfflineAssetUri(remoteUrl?: string | null): string | undefined {
  if (!remoteUrl) {
    return undefined
  }

  const map = load<OfflineAssetMap>(OFFLINE_ASSET_MAP_KEY) ?? {}
  const localUri = map[remoteUrl]
  if (!localUri) {
    return remoteUrl
  }

  try {
    const file = new FileSystem.File(localUri)
    if (file.exists) {
      return localUri
    }
  } catch {
    return remoteUrl
  }

  return remoteUrl
}

export async function startBackgroundOfflineSync(role: AppRole) {
  if (Platform.OS === "web") {
    return
  }

  if (syncInProgress) {
    return syncInProgress
  }

  syncInProgress = runOfflineSync(role)
    .catch(() => {
      // Background sync should not block UI flow.
    })
    .finally(() => {
      syncInProgress = null
    })

  return syncInProgress
}

async function runOfflineSync(role: AppRole) {
  console.log(`[offlineSync] Starting sync for role: ${role}`)
  const online = await hasInternetConnection()
  if (!online) {
    console.log("[offlineSync] No internet connection, skipping sync.")
    return
  }
  if (!role) {
    console.warn("[offlineSync] Sync aborted: role is not defined.")
    return
  }

  const projects = await fetchAllProjects()
  console.log(`[offlineSync] Fetched ${projects.length} projects from server`)
  
  if (projects.length > 0) {
    // Merge fetched projects with cache, preserving local file URLs
    const mergedProjects = mergeProjectsWithCache(projects)
    console.log(`[offlineSync] Merged projects, saving total: ${mergedProjects.length}`)
    save(OFFLINE_PROJECTS_KEY, mergedProjects)
  } else {
    console.warn("[offlineSync] Fetched 0 projects, skipping project cache update to prevent data loss")
  }
 
  if (role === "teacher") {
    const classes = await fetchAllClasses()
    console.log(`[offlineSync] Fetched ${classes.length} classes`)
    if (classes.length > 0) {
      save(OFFLINE_CLASSES_KEY, classes)
    } else {
      console.warn("[offlineSync] Fetched 0 classes, skipping save to avoid data loss if unexpected")
    }
  }
 
  if (role === "student") {
    const assignments = await fetchAllAssignments()
    console.log(`[offlineSync] Fetched ${assignments.length} assignments`)
    if (assignments.length > 0) {
      save(OFFLINE_ASSIGNMENTS_KEY, assignments)
    } else {
      console.warn("[offlineSync] Fetched 0 assignments, skipping save to avoid data loss if unexpected")
    }
  }
 
  // Cache assets for the latest state of projects
  const finalProjects = getCachedProjects()
  await cacheProjectAssets(finalProjects)
 
  if (role === "student") {
    const assignments = getCachedAssignments()
    await cacheAssignmentAssets(assignments)
  }
 
  save(OFFLINE_LAST_SYNC_KEY, Date.now())
  console.log("[offlineSync] Background sync completed")
}

async function fetchAllProjects() {
  const pageSize = 100
  const result: ProjectItem[] = []
  let page = 1
  let pageCount = 1

  while (page <= pageCount) {
    const response = await getProjectsMy({
      query: {
        "pagination[page]": page,
        "pagination[pageSize]": pageSize,
      },
    })

    result.push(...(response.data?.data ?? []))

    const pagination = response.data?.meta?.pagination
    pageCount = pagination?.pageCount ?? page
    page += 1
  }

  return result
}

async function fetchAllClasses() {
  const pageSize = 100
  const result: ClassMyItem[] = []
  let page = 1
  let pageCount = 1

  while (page <= pageCount) {
    const response = await getClassesMy({
      query: {
        "pagination[page]": page,
        "pagination[pageSize]": pageSize,
      },
    })

    result.push(...(response.data?.data ?? []))

    const pagination = response.data?.meta?.pagination
    pageCount = pagination?.pageCount ?? page
    page += 1
  }

  return result
}

async function fetchAllAssignments() {
  const pageSize = 100
  const result: ClassAssignmentItemStudent[] = []
  let page = 1
  let pageCount = 1

  while (page <= pageCount) {
    const response = await getClassAssignmentsForStudent({
      query: {
        "pagination[page]": page,
        "pagination[pageSize]": pageSize,
      },
    })

    result.push(...(response.data?.data ?? []))

    const pagination = response.data?.meta?.pagination
    pageCount = pagination?.pageCount ?? page
    page += 1
  }

  return result
}

async function cacheProjectAssets(projects: ProjectItem[]) {
  for (const item of projects) {
    await cacheRemoteAsset(item.sjr_file?.url)
    await cacheRemoteAsset(item.thumbnail?.url)
  }
}

async function cacheAssignmentAssets(assignments: ClassAssignmentItemStudent[]) {
  for (const item of assignments) {
    await cacheRemoteAsset(item.assigned_sjr_file?.url)
    await cacheRemoteAsset(item.assigned_thumbnail?.url)
  }
}

async function cacheRemoteAsset(remoteUrl?: string | null) {
  if (!remoteUrl || Platform.OS === "web") {
    return null
  }

  const currentMap = load<OfflineAssetMap>(OFFLINE_ASSET_MAP_KEY) ?? {}
  const existing = currentMap[remoteUrl]
  if (existing) {
    try {
      const existingFile = new FileSystem.File(existing)
      if (existingFile.exists) {
        return existing
      }
    } catch {
      // Continue and redownload.
    }
  }

  const online = await hasInternetConnection()
  if (!online) {
    return null
  }

  const response = await axios.get<ArrayBuffer>(remoteUrl, {
    responseType: "arraybuffer",
  })

  const bytes = new Uint8Array(response.data)
  const assetsDir = new FileSystem.Directory(FileSystem.Paths.document, "offline-assets")
  if (!assetsDir.exists) {
    assetsDir.create({ intermediates: true })
  }

  const sanitized = encodeURIComponent(remoteUrl).replace(/%/g, "_")
  const ext = inferExtension(remoteUrl)
  const target = new FileSystem.File(assetsDir, `${sanitized}${ext}`)

  if (!target.exists) {
    target.create({ intermediates: true })
  }

  target.write(bytes)

  const nextMap: OfflineAssetMap = {
    ...currentMap,
    [remoteUrl]: target.uri,
  }
  save(OFFLINE_ASSET_MAP_KEY, nextMap)

  return target.uri
}

function inferExtension(url: string) {
  try {
    const parsed = new URL(url)
    const path = parsed.pathname || ""
    const index = path.lastIndexOf(".")
    if (index > -1) {
      const ext = path.slice(index)
      if (ext.length > 1 && ext.length < 10) {
        return ext
      }
    }
  } catch {
    // fall through
  }
  return ".bin"
}
