import { useEffect, useMemo, useRef, useState } from "react"
import {
  Animated,
  Easing,
  Image,
  ImageBackground,
  Keyboard,
  NativeModules,
  Platform,
  Pressable,
  StyleSheet,
  TouchableWithoutFeedback,
  View,
} from "react-native"
import { useCameraPermissions, useMicrophonePermissions } from "expo-camera"
import Constants from "expo-constants"
import { randomUUID } from "expo-crypto"
import * as FileSystem from "expo-file-system"
import { useLocalSearchParams, useRouter } from "expo-router"
import { useQueryClient } from "@tanstack/react-query"
import axios from "axios"
import { format } from "date-fns"
import { WebView } from "react-native-webview"
import type { WebViewErrorEvent } from "react-native-webview/lib/WebViewTypes"
import { Toast } from "toastify-react-native"

import { getProjectsMyQueryKey } from "@/client/@tanstack/react-query.gen"
import { ProjectEditResponse, ProjectItem, ProjectUploadResponse, UploadFile } from "@/client"
import { Button } from "@/components/Button"
import { Icon } from "@/components/Icon"
import { Screen } from "@/components/Screen"
import { Text } from "@/components/Text"
import { TextField } from "@/components/TextField"
import Config from "@/config/config.dev"
import { translate } from "@/i18n/translate"
import { useAuthToken, useAuthUser } from "@/stores/auth/auth.selectors"
import { colors } from "@/theme/colors"
import { useAppTheme } from "@/theme/context"
import { moderateScale } from "@/theme/spacing"
import { $styles } from "@/theme/styles"
import { typography } from "@/theme/typography"
import { hasInternetConnection } from "@/utils/network"
import { upsertPendingUpload } from "@/utils/scratchjrPendingUploads"
import { resolveOfflineAssetUri, upsertOfflineProjectDetail } from "@/utils/offlineSync"
import { useSafeAreaInsetsStyle } from "@/utils/useSafeAreaInsetsStyle"

const OFFLINE_BRIDGE_PROXY_PREFIX = "https://offline.local/__local__?uri="
const ANDROID_SCRATCHJR_STATIC_BASES = [
  "file:///android_asset/ScratchJr/static/",
  "file:///android_asset/public/ScratchJr/static/",
  "file:///android_asset/assets/public/ScratchJr/static/",
  "file:///android_asset/assets/ScratchJr/static/",
]

function normalizeProjectFilePath(filepath: string): string {
  if (!filepath.startsWith("file://")) {
    return filepath
  }

  // Android WebView works better with direct file:// URIs in query params.
  if (Platform.OS === "android") {
    return filepath
  }

  return `${OFFLINE_BRIDGE_PROXY_PREFIX}${encodeURIComponent(filepath)}`
}

export function ScratchJrScreen() {
  const queryClient = useQueryClient()
  const user = useAuthUser()
  const token = useAuthToken()
  const { themed } = useAppTheme()
  const insets = useSafeAreaInsetsStyle(["top", "bottom"])
  const { mode, filepath, projectId, filename } = useLocalSearchParams<{
    mode?: string
    filepath?: string
    filename?: UploadFile["name"]
    projectId?: ProjectItem["documentId"]
  }>()
  const router = useRouter()
  const webViewRef = useRef<WebView>(null)
  const projectNameInputRef = useRef<any>(null)
  const [microphonePermission, requestMicrophonePermission] = useMicrophonePermissions()
  const [cameraPermission, requestCameraPermission] = useCameraPermissions()

  const editScratch = mode === "new" || mode === "edit"

  const [loadError, setLoadError] = useState<string | null>(null)
  const [debugInfo, setDebugInfo] = useState<string>("")
  const [androidStaticBaseIndex, setAndroidStaticBaseIndex] = useState(0)
  const [isLoadingEditor, setIsLoadingEditor] = useState(editScratch)
  const [isWebViewLoading, setIsWebViewLoading] = useState(true)
  const [_currentUrl, setCurrentUrl] = useState<string>("")
  const [projectName, setProjectName] = useState<string>("")
  const [isSaving, setIsSaving] = useState(false)
  const [currentProjectId, setCurrentProjectId] = useState<ProjectItem["documentId"] | null>(null)
  const [loadingDots, setLoadingDots] = useState(1)
  const loadingSweepProgress = useRef(new Animated.Value(0)).current
  const editorReadyFallbackRef = useRef<ReturnType<typeof setTimeout> | null>(null)

  const dismissKeyboard = () => {
    projectNameInputRef.current?.blur()
    Keyboard.dismiss()
  }

  const iosScratchJrStaticDir = useMemo(() => resolveIosScratchJrStaticDir(), [])
  const androidScratchJrStaticDir =
    Platform.OS === "android"
      ? ANDROID_SCRATCHJR_STATIC_BASES[androidStaticBaseIndex] || ANDROID_SCRATCHJR_STATIC_BASES[0]
      : undefined

  const clearEditorFallbackTimer = () => {
    if (!editorReadyFallbackRef.current) {
      return
    }
    clearTimeout(editorReadyFallbackRef.current)
    editorReadyFallbackRef.current = null
  }

  const scheduleEditorFallback = (delayMs = 2200) => {
    clearEditorFallbackTimer()
    editorReadyFallbackRef.current = setTimeout(() => {
      setIsLoadingEditor(false)
      editorReadyFallbackRef.current = null
    }, delayMs)
  }

  const source = useMemo(() => {
    const isProduction = !__DEV__ || Constants.executionEnvironment === "storeClient"

    // if (!isProduction) {
    //   const derivedUrl = derivePackagerUrl(mode as "new" | "edit" | "help", filepath)
    //   if (derivedUrl) {
    //     setDebugInfo(`Loading from Metro: ${derivedUrl}`)
    //     return { uri: derivedUrl }
    //   }
    // }

    const bundleUrl = getProductBundleUrl(
      mode as "new" | "edit" | "help",
      filepath,
      androidScratchJrStaticDir,
    )

    if (bundleUrl) {
      setDebugInfo(`Loading from local bundle: ${bundleUrl}`)
      return { uri: bundleUrl }
    }

    setDebugInfo("Product bundle not available")
    return null
  }, [mode, filepath, androidScratchJrStaticDir])

  const showLoadingOverlay = editScratch && (isLoadingEditor || isWebViewLoading)

  useEffect(() => {
    return () => {
      clearEditorFallbackTimer()
    }
  }, [])

  useEffect(() => {
    if (!showLoadingOverlay) {
      setLoadingDots(1)
      loadingSweepProgress.setValue(0)
      return
    }

    const dotInterval = setInterval(() => {
      setLoadingDots((prev) => (prev === 3 ? 1 : prev + 1))
    }, 400)

    const sweepAnimation = Animated.loop(
      Animated.timing(loadingSweepProgress, {
        toValue: 1,
        duration: 1200,
        easing: Easing.linear,
        useNativeDriver: false,
      }),
    )

    sweepAnimation.start()

    return () => {
      clearInterval(dotInterval)
      sweepAnimation.stop()
      loadingSweepProgress.setValue(0)
    }
  }, [loadingSweepProgress, showLoadingOverlay])

  useEffect(() => {
    if (filename) {
      setProjectName(filename)
      return
    }

    setProjectName([format(new Date(), "yyyyMMdd"), user?.name].filter(Boolean).join("-"))
  }, [filename, user?.name])

  useEffect(() => {
    setCurrentProjectId(projectId || null)
  }, [projectId, user?.role, user?.name])

  useEffect(() => {
    if (editScratch) {
      if (!microphonePermission || !microphonePermission.granted) {
        requestMicrophonePermission()
      }
      if (!cameraPermission || !cameraPermission.granted) {
        requestCameraPermission()
      }
    }
  }, [editScratch, microphonePermission, cameraPermission])

  if (!source) {
    return (
      <Screen
        preset="fixed"
        contentContainerStyle={themed([$styles.flex1, insets, styles.centered])}
      >
        <Text text="Unable to locate the ScratchJr bundle." />
      </Screen>
    )
  }

  if (loadError) {
    return (
      <Screen
        preset="fixed"
        contentContainerStyle={themed([$styles.flex1, insets, styles.centered])}
      >
        <View style={styles.errorContainer}>
          <Text text="Unable to load ScratchJr" style={styles.errorTitle} />
          <Text text={loadError} style={styles.errorMessage} />
          {debugInfo ? <Text text={debugInfo} style={styles.debugInfo} /> : null}
          <Text text="Make sure Metro bundler is running (expo start)" style={styles.errorHint} />
          <Button
            text="Retry"
            onPress={() => {
              setLoadError(null)
              webViewRef.current?.reload()
            }}
            style={styles.retryButton}
          />
        </View>
      </Screen>
    )
  }

  async function handleSaveProjectFile(
    contents: Blob | string | Uint8Array,
    thumbnail?: Blob | string | Uint8Array,
    isAutoSave = false,
    shouldNavigateAfterSave = false,
  ) {
    if (!contents) {
      throw new Error("Contents are required")
    }

    const filesToCleanup: FileSystem.File[] = []

    try {
      setIsSaving(true)

      const documentDir = FileSystem.Paths.document

      if (!documentDir.exists) {
        documentDir.create({ intermediates: true })
      }

      // Sanitize project name for filename construction to prevent slash errors on Android
      const sanitizedName = projectName.replace(/[/\:\*\"\?<>\|]/g, "_") || "untitled"
      const localFileName = `${format(new Date(), "yyyyMMdd")}${randomUUID()}${sanitizedName}.sjr`
      const file = new FileSystem.File(documentDir, localFileName)
      const localFileUri = file.uri

      if (!file.exists) {
        file.create({ intermediates: true })
      }

      let dataToWrite: string | Uint8Array
      let encoding: "utf8" | "base64" | undefined

      if (contents instanceof Blob) {
        const arrayBuffer = await contents.arrayBuffer()
        dataToWrite = new Uint8Array(arrayBuffer)
        encoding = undefined
      } else if (contents instanceof Uint8Array) {
        dataToWrite = contents
        encoding = undefined
      } else if (typeof contents === "string") {
        const isBase64 = /^[A-Za-z0-9+/=]+$/.test(contents) && contents.length > 100
        dataToWrite = contents
        encoding = isBase64 ? "base64" : "utf8"
      } else {
        throw new Error("Unsupported contents type")
      }

      if (encoding) {
        file.write(dataToWrite as string, { encoding })
      } else {
        file.write(dataToWrite as Uint8Array)
      }

      if (Platform.OS !== "web") {
        filesToCleanup.push(file)
      }

      const hasInternet = await hasInternetConnection()

      if (!hasInternet) {
        if (Platform.OS !== "web") {
          let offlineThumbnailFileName: string | null = null
          let offlineThumbnailUri: string | null = null

          if (thumbnail) {
            if (typeof thumbnail === "string" || thumbnail instanceof Uint8Array) {
              const thumbnailFile = new FileSystem.File(documentDir, `thumbnail_${Date.now()}.png`)
              if (!thumbnailFile.exists) {
                thumbnailFile.create({ intermediates: true })
              }

              if (typeof thumbnail === "string") {
                const thumbnailBytes = Uint8Array.from(atob(thumbnail), (c) => c.charCodeAt(0))
                thumbnailFile.write(thumbnailBytes)
              } else {
                thumbnailFile.write(thumbnail)
              }

              offlineThumbnailFileName = thumbnailFile.name
              offlineThumbnailUri = thumbnailFile.uri
            }
          }

          upsertPendingUpload({
            localFileName,
            projectId: currentProjectId,
            thumbnailFileName: offlineThumbnailFileName,
            title:
              projectName ||
              `${format(new Date(), "yyyyMMdd")}/${user?.name || "unknown-user"}`,
          })

          upsertOfflineProjectDetail({
            currentProjectId,
            localFileUri,
            projectTitle:
              projectName ||
              `${format(new Date(), "yyyyMMdd")}/${user?.name || "unknown-user"}`,
            role: user?.role,
            thumbnailLocalUri: offlineThumbnailUri,
          })
        }

        // Reset queries so My Works list is updated even if we are offline (will read from local cache).
        // Using a predicate to ensure we match the object-based query keys.
        await queryClient.resetQueries({
          predicate: (query) =>
            Array.isArray(query.queryKey) &&
            typeof query.queryKey[0] === "object" &&
            ["getProjectsMy", "getClassAssignmentsMy", "getClassAssignmentsForStudent", "getClassesMy"].includes(
              (query.queryKey[0] as any)._id,
            ),
        })

        if (!isAutoSave) {
          Toast.success(translate("common:save_success"))
        }
        return
      }

      let fileToUpload: Blob | string | { uri: string; type: string; name: string }
      if (Platform.OS === "web") {
        if (contents instanceof Blob) {
          fileToUpload = contents
        } else if (typeof contents === "string") {
          const byteCharacters = atob(contents)
          const byteNumbers = new Array(byteCharacters.length)
          for (let i = 0; i < byteCharacters.length; i++) {
            byteNumbers[i] = byteCharacters.charCodeAt(i)
          }
          const byteArray = new Uint8Array(byteNumbers)
          fileToUpload = new Blob([byteArray], { type: "application/octet-stream" })
        } else if (contents instanceof Uint8Array) {
          const uint8Array = new Uint8Array(contents.length)
          uint8Array.set(contents)
          fileToUpload = new Blob([uint8Array], { type: "application/octet-stream" })
        } else {
          fileToUpload = contents as Blob
        }
      } else {
        fileToUpload = {
          uri: file.uri,
          type: "application/octet-stream",
          name: `${projectName}.sjr`,
        } as any
      }

      const formData = new FormData()
      formData.append("title", projectName || `${format(new Date(), "yyyyMMdd")}/${user?.name}`)
      if (Platform.OS === "web") {
        formData.append("sjr_file", fileToUpload as any)
      } else {
        formData.append("sjr_file", {
          ...(fileToUpload as any),
          name: `${sanitizedName}.sjr`,
        } as any)
      }

      let thumbnailFile: FileSystem.File | null = null

      if (thumbnail) {
        let thumbnailToUpload: Blob | { uri: string; type: string; name: string }

        if (Platform.OS === "web") {
          if (typeof thumbnail === "string") {
            const byteCharacters = atob(thumbnail)
            const byteNumbers = new Array(byteCharacters.length)
            for (let i = 0; i < byteCharacters.length; i++) {
              byteNumbers[i] = byteCharacters.charCodeAt(i)
            }
            const byteArray = new Uint8Array(byteNumbers)
            thumbnailToUpload = new Blob([byteArray], { type: "image/png" })
          } else if (thumbnail instanceof Blob) {
            thumbnailToUpload = thumbnail
          } else if (thumbnail instanceof Uint8Array) {
            const uint8Array = new Uint8Array(thumbnail.length)
            uint8Array.set(thumbnail)
            thumbnailToUpload = new Blob([uint8Array], { type: "image/png" })
          } else {
            throw new Error("Unsupported thumbnail type for web")
          }
          formData.append("thumbnail", thumbnailToUpload)
        } else {
          if (typeof thumbnail === "string") {
            thumbnailFile = new FileSystem.File(documentDir, `thumbnail_${Date.now()}.png`)
            if (!thumbnailFile.exists) {
              thumbnailFile.create({ intermediates: true })
            }
            const thumbnailBytes = Uint8Array.from(atob(thumbnail), (c) => c.charCodeAt(0))
            thumbnailFile.write(thumbnailBytes)

            thumbnailToUpload = {
              uri: thumbnailFile.uri,
              type: "image/png",
              name: "thumbnail.png",
            } as any
          } else if (thumbnail instanceof Uint8Array) {
            thumbnailFile = new FileSystem.File(documentDir, `thumbnail_${Date.now()}.png`)
            if (!thumbnailFile.exists) {
              thumbnailFile.create({ intermediates: true })
            }
            thumbnailFile.write(thumbnail)
            thumbnailToUpload = {
              uri: thumbnailFile.uri,
              type: "image/png",
              name: "thumbnail.png",
            } as any
          } else {
            throw new Error("Unsupported thumbnail type for React Native")
          }
          if (thumbnailFile) {
            filesToCleanup.push(thumbnailFile)
          }
          formData.append("thumbnail", thumbnailToUpload as any)
        }
      }
      if (!currentProjectId) {
        const config = {
          method: "post",
          maxBodyLength: Infinity,
          url: `${Config.API_URL}/projects/upload`,
          headers: {
            "accept": "application/json",
            "Authorization": `Bearer ${token}`,
            "Content-Type": "multipart/form-data",
          },
          data: formData,
        }
        const { data } = await axios.request(config)
        const uploadedProject = (data as ProjectUploadResponse).data
        setCurrentProjectId(uploadedProject?.documentId)
        upsertOfflineProjectDetail({
          currentProjectId: uploadedProject?.documentId,
          localFileUri,
          project: uploadedProject,
          role: user?.role,
        })
      }
      if (currentProjectId) {
        const config = {
          method: "put",
          maxBodyLength: Infinity,
          url: `${Config.API_URL}/projects/${currentProjectId}/edit`,
          headers: {
            "accept": "application/json",
            "Authorization": `Bearer ${token}`,
            "Content-Type": "multipart/form-data",
          },
          data: formData,
        }
        const { data } = await axios.request(config)
        const editedProject = (data as ProjectEditResponse).data
        setCurrentProjectId(editedProject?.documentId)
        upsertOfflineProjectDetail({
          currentProjectId: editedProject?.documentId || currentProjectId,
          localFileUri,
          project: editedProject,
          role: user?.role,
        })
      }

      if (Platform.OS !== "web" && filesToCleanup.length > 0) {
        for (const fileToDelete of filesToCleanup) {
          try {
            if (fileToDelete.exists) {
              fileToDelete.delete()
            }
          } catch {}
        }
      }

      // Reset queries to refresh the project list after successful online save.
      // We use a predicate because the auto-generated query keys are objects, making prefix matching flaky.
      await queryClient.resetQueries({
        predicate: (query) =>
          Array.isArray(query.queryKey) &&
          typeof query.queryKey[0] === "object" &&
          ["getProjectsMy", "getClassAssignmentsMy", "getClassAssignmentsForStudent", "getClassesMy"].includes(
            (query.queryKey[0] as any)._id,
          ),
      })

      if (!isAutoSave) {
        router.push(user?.role === "student" ? "/my-works" : "/class-works")

        Toast.success(translate("common:save_success"))
      }
    } catch (error) {
      if (Platform.OS !== "web" && filesToCleanup.length > 0) {
        for (const fileToDelete of filesToCleanup) {
          try {
            if (fileToDelete.exists) {
              fileToDelete.delete()
            }
          } catch {}
        }
      }

      console.error("ScratchJr save project error:", error)
      Toast.error(translate("common:save_failed"))
    } finally {
      setIsSaving(false)
      if (shouldNavigateAfterSave || !isAutoSave) {
        const targetRoute = user?.role === "student" ? "/my-works" : "/class-works"
        if (Platform.OS === "android") {
          setTimeout(() => {
            router.push(targetRoute)
          }, 300)
        } else {
          router.push(targetRoute)
        }
      }
    }
  }

  return (
    <Screen preset="fixed" contentContainerStyle={themed([$styles.flex1])}>
      <ImageBackground
        source={require("../../public/img/edit-bg.png")}
        style={styles.background}
        resizeMode="cover"
      >
        <View style={styles.projectSection}>
          <Pressable
            disabled={isSaving}
            onPress={() => {
              if (editScratch) {
                webViewRef.current?.postMessage(
                  JSON.stringify({
                    type: "GET_PROJECT_CONTENTS",
                    isAutoSave: true,
                    shouldNavigateAfterSave: true,
                  }),
                )
              } else {
                router.push(user?.role === "student" ? "/my-works" : "/class-works")
              }
            }}
            style={[styles.buttonHome, isSaving && styles.disabledHomeButton]}
          >
            <Icon icon="home" style={{ width: moderateScale(47), height: moderateScale(36) }} />
          </Pressable>

          {editScratch && (
            <TextField
              ref={projectNameInputRef}
              containerStyle={styles.projectInputField}
              labelTx="edit:project_name"
              inputWrapperStyle={{ width: moderateScale(500) }}
              placeholderTx="edit:project_placeholder"
              value={projectName}
              onChangeText={setProjectName}
              RightAccessory={
                <Icon
                  icon="penLine"
                  style={{ width: moderateScale(24), height: moderateScale(24) }}
                />
              }
            />
          )}
        </View>

        {editScratch && (
          <Button
            tx="edit:edit"
            disabled={!projectName?.trim() || isSaving}
            LeftAccessory={
              <Icon
                icon="projectAdd"
                style={{ width: moderateScale(20), height: moderateScale(20) }}
              />
            }
            shape="rounded"
            style={styles.editButton}
            textStyle={styles.editButtonText}
            onPress={() => {
              webViewRef.current?.postMessage(
                JSON.stringify({
                  type: "GET_PROJECT_CONTENTS",
                }),
              )
            }}
          />
        )}
      </ImageBackground>
      <View style={styles.webviewContainer}>
        <TouchableWithoutFeedback onPress={dismissKeyboard}>
          <WebView
            source={source}
            originWhitelist={["*"]}
            allowFileAccess
            allowFileAccessFromFileURLs
            allowUniversalAccessFromFileURLs
            allowingReadAccessToURL={
              Platform.OS === "ios" ? (iosScratchJrStaticDir ?? undefined) : undefined
            }
            setSupportMultipleWindows={false}
            startInLoadingState
            javaScriptEnabled
            domStorageEnabled
            allowsInlineMediaPlayback={true}
            mediaPlaybackRequiresUserAction={false}
            allowFileAccess={true}
            allowsProtectedMediaPlayback={true}
            javaScriptCanOpenWindowsAutomatically={true}
            // @ts-ignore
            onPermissionRequest={(event: any) => {
              const { resources } = event.nativeEvent
              // Grant all requested resources (camera, microphone, etc.)
              event.grant(resources)
            }}
            mixedContentMode="always"
            scrollEnabled={true}
            nestedScrollEnabled={true}
            bounces={false}
            showsVerticalScrollIndicator={true}
            showsHorizontalScrollIndicator={false}
            ref={webViewRef}
            style={styles.webview}
            onTouchStart={dismissKeyboard}
            userAgent={
              Platform.OS === "android"
                ? "Mozilla/5.0 (Linux; Android 14; K) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/130.0.0.0 Mobile Safari/537.36"
                : undefined
            }
            onLoadStart={() => {
              if (editScratch) {
                setIsWebViewLoading(true)
                setIsLoadingEditor(true)
              }
            }}
            onLoadEnd={() => {
              setIsWebViewLoading(false)
              if (editScratch) {
                scheduleEditorFallback()
              }
            }}
            onNavigationStateChange={(navState) => {
              const url = navState.url || ""
              setCurrentUrl(url)

              if (!editScratch) {
                return
              }

              if (url.includes("editor.html")) {
                setIsLoadingEditor(true)
                scheduleEditorFallback(3200)
                return
              }

              // Keep editor usable even when remote project open fails and page stays at home/help/index.
              if (
                url.includes("home.html") ||
                url.includes("index.html") ||
                url.includes("help.html")
              ) {
                clearEditorFallbackTimer()
                setIsLoadingEditor(false)
              }
            }}
            onError={(syntheticEvent: WebViewErrorEvent) => {
              const { nativeEvent } = syntheticEvent

              if (
                Platform.OS === "android" &&
                nativeEvent.code === -1 &&
                androidStaticBaseIndex < ANDROID_SCRATCHJR_STATIC_BASES.length - 1
              ) {
                setAndroidStaticBaseIndex((prev) => prev + 1)
                return
              }

              const errorMessage =
                nativeEvent.description || `Failed to load ScratchJr (code: ${nativeEvent.code})`
              setLoadError(`${errorMessage}\n\nURL: ${source?.uri || "unknown"}`)
              clearEditorFallbackTimer()
              setIsLoadingEditor(false)
              setIsWebViewLoading(false)
            }}
            onHttpError={(syntheticEvent) => {
              const { nativeEvent } = syntheticEvent

              if (
                Platform.OS === "android" &&
                androidStaticBaseIndex < ANDROID_SCRATCHJR_STATIC_BASES.length - 1
              ) {
                setAndroidStaticBaseIndex((prev) => prev + 1)
                return
              }

              setLoadError(
                `HTTP Error ${nativeEvent.statusCode}: ${nativeEvent.description || "Failed to load ScratchJr"}\n\nURL: ${source?.uri || "unknown"}`,
              )
              clearEditorFallbackTimer()
              setIsLoadingEditor(false)
              setIsWebViewLoading(false)
            }}
            onMessage={async (event) => {
              try {
                const data = JSON.parse(event.nativeEvent.data)

                if (data.type === "DISMISS_KEYBOARD") {
                  dismissKeyboard()
                }

                if (data.type === "NAVIGATE_TO_MY_WORKS") {
                  router.push(user?.role === "student" ? "/my-works" : "/class-works")
                }

                if (data.type === "PROJECT_CONTENTS_RESPONSE") {
                  const { contents, thumbnail, isAutoSave, shouldNavigateAfterSave } = data
                  handleSaveProjectFile(
                    contents,
                    thumbnail,
                    isAutoSave || false,
                    shouldNavigateAfterSave,
                  )
                }

                if (data.type === "AUTO_SAVE_TRIGGER_UPLOAD") {
                  if (editScratch) {
                    webViewRef.current?.postMessage(
                      JSON.stringify({
                        type: "GET_PROJECT_CONTENTS",
                        isAutoSave: true,
                      }),
                    )
                  }
                }

                if (data.type === "EDITOR_READY") {
                  clearEditorFallbackTimer()
                  setIsLoadingEditor(false)
                }

                if (data.type === "PROJECT_DOWNLOAD_ERROR") {
                  clearEditorFallbackTimer()
                  setIsLoadingEditor(false)
                }

                if (data.type === "DOWNLOAD_PROJECT") {
                  const { url } = data
                  try {
                    const bridgedLocalUri =
                      typeof url === "string" && url.startsWith(OFFLINE_BRIDGE_PROXY_PREFIX)
                        ? decodeURIComponent(url.slice(OFFLINE_BRIDGE_PROXY_PREFIX.length))
                        : null

                    // Try offline-first: resolve URL to local file.
                    // If WebView already sends a file URI, prefer it directly.
                    const resolvedPath =
                      bridgedLocalUri ||
                      (typeof url === "string" && url.startsWith("file://")
                        ? url
                        : resolveOfflineAssetUri(url))
                    let base64: string | null = null

                    if (resolvedPath && resolvedPath.startsWith("file://")) {
                      // Local file available - read from filesystem
                      try {
                        const localFile = new FileSystem.File(resolvedPath)
                        if (localFile.exists) {
                          base64 = await localFile.base64()
                        }
                      } catch (localError) {
                        console.warn(
                          "Failed to read local offline asset, falling back to network",
                          {
                            url,
                            error: localError,
                          },
                        )
                      }
                    }

                    // If offline file not available, only use network when internet exists.
                    if (!base64) {
                      const isOnline = await hasInternetConnection()
                      if (!isOnline) {
                        throw new Error("Offline asset unavailable")
                      }

                      const response = await axios.get(url, {
                        responseType: "arraybuffer",
                        headers: {
                          Accept: "application/octet-stream",
                        },
                      })
                      const uint8Array = new Uint8Array(response.data)
                      let binaryString = ""
                      const chunkSize = 8192 // Process in chunks to avoid stack overflow
                      for (let i = 0; i < uint8Array.length; i += chunkSize) {
                        const chunk = uint8Array.subarray(i, i + chunkSize)
                        binaryString += String.fromCharCode.apply(null, Array.from(chunk))
                      }
                      base64 = btoa(binaryString)
                    }

                    const script = `
                      (function() {
                        if (window.handleProjectDownload) {
                          window.handleProjectDownload(${JSON.stringify({
                            type: "PROJECT_DOWNLOADED",
                            data: base64,
                          })});
                        }
                      })();
                      true;
                    `
                    webViewRef.current?.injectJavaScript(script)
                  } catch (error) {
                    const errorMessage = error instanceof Error ? error.message : String(error)
                    const errorScript = `
                      (function() {
                        if (window.handleProjectDownload) {
                          window.handleProjectDownload(${JSON.stringify({
                            type: "PROJECT_DOWNLOAD_ERROR",
                            error: errorMessage,
                          })});
                        }
                      })();
                      true;
                    `
                    webViewRef.current?.injectJavaScript(errorScript)
                  }
                }
              } catch {}
            }}
            injectedJavaScript={`
            (function() {
              var lastDismissAt = 0;

              function isEditableElement(element) {
                if (!element) {
                  return false;
                }
                var tagName = (element.tagName || '').toLowerCase();
                return tagName === 'input' || tagName === 'textarea' || !!element.isContentEditable;
              }

              function shouldKeepEditing(activeElement, targetElement) {
                if (!activeElement || !targetElement) {
                  return false;
                }
                if (targetElement === activeElement) {
                  return true;
                }
                try {
                  if (activeElement.contains && activeElement.contains(targetElement)) {
                    return true;
                  }
                } catch (e) {}
                try {
                  if (activeElement.form && activeElement.form.contains && activeElement.form.contains(targetElement)) {
                    return true;
                  }
                } catch (e) {}
                return false;
              }

              function blurFocusedEditable(event, targetWindow) {
                try {
                  if (!targetWindow || !targetWindow.document) {
                    return false;
                  }
                  var activeElement = targetWindow.document.activeElement;
                  if (!isEditableElement(activeElement)) {
                    return false;
                  }
                  var targetElement = event && (event.target || event.srcElement);
                  if (shouldKeepEditing(activeElement, targetElement)) {
                    return false;
                  }
                  if (typeof activeElement.blur === 'function') {
                    activeElement.blur();
                    return true;
                  }
                } catch (e) {}
                return false;
              }

              function requestKeyboardDismiss(event, targetWindow) {
                blurFocusedEditable(event, targetWindow);
                var now = Date.now();
                if (now - lastDismissAt < 100) {
                  return;
                }
                lastDismissAt = now;
                if (window.ReactNativeWebView) {
                  window.ReactNativeWebView.postMessage(JSON.stringify({
                    type: 'DISMISS_KEYBOARD'
                  }));
                }
              }

              function attachDismissListeners(targetWindow) {
                if (!targetWindow || targetWindow.__RN_KB_DISMISS_LISTENERS__) {
                  return;
                }

                targetWindow.__RN_KB_DISMISS_LISTENERS__ = true;

                try {
                  targetWindow.addEventListener('pointerdown', function(event) { requestKeyboardDismiss(event, targetWindow); }, true);
                  targetWindow.addEventListener('touchstart', function(event) { requestKeyboardDismiss(event, targetWindow); }, true);
                  targetWindow.addEventListener('mousedown', function(event) { requestKeyboardDismiss(event, targetWindow); }, true);
                  targetWindow.addEventListener('click', function(event) { requestKeyboardDismiss(event, targetWindow); }, true);
                } catch (e) {}

                try {
                  if (targetWindow.document) {
                    targetWindow.document.addEventListener('pointerdown', function(event) { requestKeyboardDismiss(event, targetWindow); }, true);
                    targetWindow.document.addEventListener('touchstart', function(event) { requestKeyboardDismiss(event, targetWindow); }, true);
                    targetWindow.document.addEventListener('mousedown', function(event) { requestKeyboardDismiss(event, targetWindow); }, true);
                    targetWindow.document.addEventListener('click', function(event) { requestKeyboardDismiss(event, targetWindow); }, true);
                  }
                } catch (e) {}

                try {
                  if (targetWindow.document) {
                    var iframes = targetWindow.document.querySelectorAll('iframe');
                    for (var i = 0; i < iframes.length; i++) {
                      bindIframe(iframes[i]);
                    }
                  }
                } catch (e) {}
              }

              function bindIframe(iframe) {
                if (!iframe || iframe.__RN_KB_DISMISS_BOUND__) {
                  return;
                }

                iframe.__RN_KB_DISMISS_BOUND__ = true;

                function bindContentWindow() {
                  try {
                    if (iframe.contentWindow) {
                      attachDismissListeners(iframe.contentWindow);
                    }
                  } catch (e) {}
                }

                try {
                  iframe.addEventListener('load', bindContentWindow, true);
                } catch (e) {}

                bindContentWindow();
              }

              attachDismissListeners(window);

              try {
                var observer = new MutationObserver(function(mutations) {
                  for (var i = 0; i < mutations.length; i++) {
                    var addedNodes = mutations[i].addedNodes;
                    for (var j = 0; j < addedNodes.length; j++) {
                      var node = addedNodes[j];
                      if (!node || !node.tagName) {
                        continue;
                      }

                      if (node.tagName.toLowerCase() === 'iframe') {
                        bindIframe(node);
                        continue;
                      }

                      if (node.querySelectorAll) {
                        var nestedIframes = node.querySelectorAll('iframe');
                        for (var k = 0; k < nestedIframes.length; k++) {
                          bindIframe(nestedIframes[k]);
                        }
                      }
                    }
                  }
                });

                observer.observe(document.documentElement || document.body, {
                  childList: true,
                  subtree: true
                });
              } catch (e) {}

              // Set up handler for project download responses from React Native
              window.handleProjectDownload = function(data) {
                // Dispatch a custom event that Home.js can listen to
                var event = new CustomEvent('projectDownloadResponse', { detail: data });
                window.dispatchEvent(event);
              };

              function checkEditorReady() {
                if (window.location.href.includes('editor.html')) {
                  var checkInterval = setInterval(function() {
                    if (window.ScratchJr && window.ScratchJr.currentProject) {
                      clearInterval(checkInterval);
                      if (window.ReactNativeWebView) {
                        window.ReactNativeWebView.postMessage(JSON.stringify({
                          type: 'EDITOR_READY'
                        }));
                      }
                    }
                  }, 100);

                  setTimeout(function() {
                    clearInterval(checkInterval);
                    if (window.ReactNativeWebView) {
                      window.ReactNativeWebView.postMessage(JSON.stringify({
                        type: 'EDITOR_READY'
                      }));
                    }
                  }, 5000);
                }
              }

              checkEditorReady();
              var lastUrl = window.location.href;
              setInterval(function() {
                if (window.location.href !== lastUrl) {
                  lastUrl = window.location.href;
                  checkEditorReady();
                }
              }, 100);
            })();
            true;
          `}
          />
        </TouchableWithoutFeedback>
      </View>
      {showLoadingOverlay && (
        <View style={styles.loadingOverlay}>
          <View style={styles.loadingIconContainer}>
            <Image
              source={require("../../assets/icons/loading.png")}
              style={styles.loadingIcon}
              resizeMode="contain"
            />
            <Animated.View
              pointerEvents="none"
              style={[
                styles.loadingIconDimmer,
                {
                  height: loadingSweepProgress.interpolate({
                    inputRange: [0, 1],
                    outputRange: ["100%", "0%"],
                  }),
                },
              ]}
            />
          </View>
          <Text text={`よみこみちゅう${".".repeat(loadingDots)}`} style={styles.loadingMessage} />
        </View>
      )}
    </Screen>
  )
}

function getProductBundleUrl(
  mode?: "new" | "edit" | "help",
  filepath?: string,
  androidStaticBaseDir?: string,
): string | null {
  let basePath: string
  if (mode === "help") {
    basePath = "help.html"
  } else if (filepath) {
    const normalizedFilePath = normalizeProjectFilePath(filepath)

    basePath = `home.html?place=home&filePath=${encodeURIComponent(normalizedFilePath || "")}`
  } else if (mode === "new") {
    basePath = "home.html?place=home&autoNew=1"
  } else {
    basePath = "index.html"
  }

  if (Platform.OS === "android") {
    const baseDir = androidStaticBaseDir || "file:///android_asset/ScratchJr/static/"
    return `${baseDir}${basePath}`
  }

  if (Platform.OS === "ios") {
    const staticDir = resolveIosScratchJrStaticDir()
    if (!staticDir) {
      return null
    }
    return `${staticDir}${basePath}`
  }

  if (Platform.OS === "web" && typeof window !== "undefined") {
    return `${window.location.origin}/ScratchJr/static/${basePath}`
  }

  return null
}

function resolveIosScratchJrStaticDir(): string | null {
  if (Platform.OS !== "ios") {
    return null
  }

  const bundleDirectory =
    ((FileSystem as any).Paths?.bundle?.uri as string | undefined) ||
    ((FileSystem as any).bundleDirectory as string | undefined)

  if (!bundleDirectory) {
    return null
  }

  const normalizedBundleDir = bundleDirectory.endsWith("/")
    ? bundleDirectory
    : `${bundleDirectory}/`
  const candidates = [
    `${normalizedBundleDir}public/ScratchJr/static/`,
    `${normalizedBundleDir}ScratchJr/static/`,
    `${normalizedBundleDir}assets/public/ScratchJr/static/`,
    `${normalizedBundleDir}assets/ScratchJr/static/`,
  ]

  for (const candidate of candidates) {
    try {
      const homeFile = new FileSystem.File(`${candidate}home.html`)
      const appBundleFile = new FileSystem.File(`${candidate}app.bundle.js`)
      if (homeFile.exists && appBundleFile.exists) {
        return candidate
      }
    } catch {
      // Try next candidate.
    }
  }

  return `${normalizedBundleDir}public/ScratchJr/static/`
}

function derivePackagerUrl(mode?: "new" | "edit" | "help", filepath?: string): string | null {
  let basePath: string
  if (mode === "help") {
    basePath = "help.html"
  } else if (filepath) {
    const normalizedFilePath = normalizeProjectFilePath(filepath)

    basePath = `home.html?place=home&filePath=${encodeURIComponent(normalizedFilePath || "")}`
  } else if (mode === "new") {
    basePath = "home.html?place=home&autoNew=1"
  } else {
    basePath = "index.html"
  }

  if (Platform.OS === "web" && typeof window !== "undefined") {
    return `${window.location.origin}/scratchjr/static/${basePath}`
  }

  const buildUrl = (host: string, scheme: string) =>
    `${scheme}://${host}/scratchjr/static/${basePath}`

  if (Constants.debuggerHost) {
    const [host, port] = Constants.debuggerHost.split(":")
    // const finalPort = port || "8081"
    // // Use localhost on Android/iOS to enjoy secure context
    // const finalHost = (Platform.OS === "android" || Platform.OS === "ios") ? `localhost:${finalPort}` : `${host}:${finalPort}`
    const finalHost = port ? `${host}:${port}` : `${host}:8081`
    const url = buildUrl(finalHost, "http")

    return url
  }

  const scriptURL = NativeModules.SourceCode?.scriptURL
  if (scriptURL) {
    try {
      const parsed = new URL(scriptURL)
      if (parsed.host) {
        const scheme = parsed.protocol === "https:" ? "https" : "http"
        // const host = (Platform.OS === "android" || Platform.OS === "ios") ? `localhost:${parsed.port || "8081"}` : parsed.host
        // const url = buildUrl(host, scheme)
        const url = buildUrl(parsed.host, scheme)
        return url
      }
    } catch {}
  }

  if (Constants.expoConfig?.hostUri) {
    try {
      const hostUri = Constants.expoConfig.hostUri
      // const [host, port] = hostUri.split(":")
      // const finalPort = port || "8081"
      // const finalHost = (Platform.OS === "android" || Platform.OS === "ios") ? `localhost:${finalPort}` : `${host}:${finalPort}`
      // const url = buildUrl(finalHost, "http")
      const url = buildUrl(hostUri, "http")
      return url
    } catch {}
  }

  const fallbackHosts = ["localhost:8081", "127.0.0.1:8081"]
  const fallbackUrl = buildUrl(fallbackHosts[0], "http")

  return fallbackUrl
}

const styles = StyleSheet.create({
  background: {
    alignItems: "center",
    flexDirection: "row",
    flexWrap: "wrap",
    justifyContent: "space-between",
    paddingHorizontal: moderateScale(24),
    paddingVertical: moderateScale(12),
  },
  buttonHome: { cursor: "pointer" },
  centered: {
    alignItems: "center",
    justifyContent: "space-between",
  },
  debugInfo: {
    color: colors.palette.neutral400,
    fontSize: moderateScale(12),
    marginTop: moderateScale(8),
    textAlign: "center",
  },
  disabledHomeButton: {
    opacity: 0.5,
  },
  editButton: {
    backgroundColor: colors.palette.blue.DEFAULT,
    borderWidth: 0,
    paddingHorizontal: moderateScale(24),
    paddingVertical: moderateScale(12),
  },
  editButtonText: {
    fontFamily: typography.fonts.zenKakuGothicNew.bold,
    fontSize: moderateScale(16),
  },
  errorContainer: {
    alignItems: "center",
    gap: moderateScale(16),
    paddingHorizontal: moderateScale(24),
  },
  errorHint: {
    color: colors.palette.neutral500,
    fontSize: moderateScale(14),
    marginTop: moderateScale(12),
    textAlign: "center",
  },
  errorMessage: {
    color: colors.palette.neutral500,
    fontSize: moderateScale(14),
    marginTop: moderateScale(8),
    textAlign: "center",
  },
  errorTitle: {
    fontFamily: typography.fonts.zenKakuGothicNew.bold,
    fontSize: moderateScale(20),
    marginBottom: moderateScale(8),
  },
  loadingIcon: {
    height: "100%",
    width: "100%",
  },
  loadingIconContainer: {
    aspectRatio: 1,
    maxHeight: moderateScale(440),
    maxWidth: moderateScale(440),
    position: "relative",
    width: "80%",
  },
  loadingIconDimmer: {
    backgroundColor: colors.palette.neutral100,
    left: 0,
    opacity: 0.58,
    position: "absolute",
    right: 0,
    top: 0,
  },
  loadingMessage: {
    color: colors.palette.neutral500,
    fontFamily: typography.fonts.zenKakuGothicNew.semiBold,
    fontSize: moderateScale(14),
    marginTop: moderateScale(-72),
  },
  loadingOverlay: {
    ...StyleSheet.absoluteFillObject,
    alignItems: "center",
    backgroundColor: colors.palette.neutral100,
    gap: 0,
    justifyContent: "center",
    zIndex: 1000,
  },
  projectInputField: {
    alignItems: "center",
    flexDirection: "row",
    gap: moderateScale(12),
  },
  projectSection: {
    alignItems: "center",
    flexDirection: "row",
    gap: moderateScale(40),
  },
  retryButton: {
    marginTop: moderateScale(16),
  },
  webview: {
    backgroundColor: colors.palette.neutral100,
    flex: 1,
  },
  // eslint-disable-next-line react-native/no-unused-styles
  webviewContainer: {
    flex: 1,
    overflow: "hidden",
  },
})
