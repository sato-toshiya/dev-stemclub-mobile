import { useEffect, useRef, useState } from "react"
import { ActivityIndicator, StyleSheet, View } from "react-native"
import { LinearGradient } from "expo-linear-gradient"
import * as Network from "expo-network"
import { Slot, SplashScreen } from "expo-router"
import * as ScreenOrientation from "expo-screen-orientation"
import { useFonts } from "@expo-google-fonts/space-grotesk"
import { onlineManager, QueryClient, QueryClientProvider } from "@tanstack/react-query"
import { KeyboardProvider } from "react-native-keyboard-controller"
import {
  initialWindowMetrics,
  SafeAreaProvider,
  useSafeAreaInsets,
} from "react-native-safe-area-context"
import ToastManager, { BaseToast, Toast } from "toastify-react-native"

import { setupHeyapiClient } from "@/config/client.setup"
import { initI18n } from "@/i18n"
import { translate } from "@/i18n/translate"
import { colors } from "@/theme/colors"
import { ThemeProvider } from "@/theme/context"
import { moderateScale } from "@/theme/spacing"
import { customFontsToLoad } from "@/theme/typography"
import { loadDateFnsLocale } from "@/utils/formatDate"
import { initSecureStorage, loadString, remove, saveString } from "@/utils/storage"
import { startBackgroundOfflineSync } from "@/utils/offlineSync"
import { getPendingUploads, syncPendingUploads } from "@/utils/scratchjrPendingUploads"
import { useAuthStore } from "@/stores/auth/auth.store"
import { useClassStore } from "@/stores/class/class.store"
import { Text } from "@/components/Text"
import {
  getProjectsMyQueryKey,
  getClassAssignmentsForStudentQueryKey,
  getClassesMyQueryKey,
} from "@/client/@tanstack/react-query.gen"

SplashScreen.preventAutoHideAsync()

const INITIAL_SYNC_DONE_KEY_PREFIX = "offline.initial-sync-done.v1"

function getInitialSyncDoneKey(user: {
  role: "student" | "teacher"
  documentId?: string
  id?: string
}) {
  const userId = user.documentId || user.id || "unknown"
  return `${INITIAL_SYNC_DONE_KEY_PREFIX}:${user.role}:${userId}`
}

// Lock screen orientation immediately when module loads (before component mounts)
// This is especially important for iPad
if (typeof ScreenOrientation !== "undefined") {
  ScreenOrientation.lockAsync(ScreenOrientation.OrientationLock.LANDSCAPE).catch((error) => {
    console.error("Failed to lock screen orientation on module load:", error)
  })
}

if (__DEV__) {
  require("@/devtools/ReactotronConfig")
}

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      refetchOnWindowFocus: false,
      retry: 1,
      gcTime: 1000 * 60 * 3,
      networkMode: "always",
    },
    mutations: {
      retry: 1,
      onError: (error) => {
        Toast.error(error.message ?? translate("error:error_message_default"))
      },
      networkMode: "always",
    },
  },
})

export default function Root() {
  setupHeyapiClient()
  onlineManager.setEventListener((setOnline) => {
    const eventSubscription = Network.addNetworkStateListener((state) => {
      setOnline(!!state.isConnected)
    })
    return eventSubscription.remove
  })

  const [fontsLoaded, fontError] = useFonts(customFontsToLoad)
  const [isI18nInitialized, setIsI18nInitialized] = useState(false)
  const [isSecureStorageInitialized, setIsSecureStorageInitialized] = useState(false)
  const [isInitialOfflineSyncing, setIsInitialOfflineSyncing] = useState(false)
  const [isNetworkOfflineSyncing, setIsNetworkOfflineSyncing] = useState(false)
  const initialSyncDoneRef = useRef(false)
  const previousIsLoggedInRef = useRef(false)

  useEffect(() => {
    ;(async () => {
      try {
        await initSecureStorage()
        useAuthStore.getState().restore()
        useClassStore.getState().restore()
      } catch (error) {
        console.error("Failed to initialize secure storage:", error)
      } finally {
        setIsSecureStorageInitialized(true)
      }
    })()
  }, [])

  useEffect(() => {
    ;(async () => {
      try {
        await ScreenOrientation.lockAsync(ScreenOrientation.OrientationLock.LANDSCAPE)
        setTimeout(async () => {
          try {
            await ScreenOrientation.lockAsync(ScreenOrientation.OrientationLock.LANDSCAPE)
          } catch (error) {
            console.error("Failed to lock screen orientation on retry:", error)
          }
        }, 100)
      } catch (error) {
        console.error("Failed to lock screen orientation:", error)
      }
    })()
  }, [])


  useEffect(() => {
    initI18n()
      .then(() => setIsI18nInitialized(true))
      .then(() => loadDateFnsLocale())
  }, [])

  const loaded = fontsLoaded && isI18nInitialized && isSecureStorageInitialized

  useEffect(() => {
    if (fontError) throw fontError
  }, [fontError])

  useEffect(() => {
    if (loaded) {
      SplashScreen.hideAsync()
    }
  }, [loaded])

  // Track initial offline sync on login + show loading indicator
  useEffect(() => {
    const unsubscribe = useAuthStore.subscribe((state, prevState) => {
      const wasLoggedIn = previousIsLoggedInRef.current
      const isLoggedIn = state.isLoggedIn

      // Clear first-sync marker on logout so the next login runs initial sync again.
      if (!isLoggedIn && wasLoggedIn) {
        previousIsLoggedInRef.current = false
        initialSyncDoneRef.current = false

        const previousUser = prevState.user
        if (previousUser?.role) {
          remove(getInitialSyncDoneKey(previousUser as any))
        }

        return
      }

      if (isLoggedIn && !wasLoggedIn && !initialSyncDoneRef.current) {
        previousIsLoggedInRef.current = true

        // Get current state for the async operation
        const { user, token } = useAuthStore.getState()
        if (!user?.role || !token) {
          return
        }

        const initialSyncDoneKey = getInitialSyncDoneKey(user as any)
        if (loadString(initialSyncDoneKey) === "1") {
          initialSyncDoneRef.current = true
          return
        }

        initialSyncDoneRef.current = true
        setIsInitialOfflineSyncing(true)

        if (user?.role && token) {
          const funcSync = async () => {
            try {
              // First, sync any pending uploads if they exist
              const pendingUploads = getPendingUploads()
              if (pendingUploads.length > 0) {
                await syncPendingUploads(token)
              }

              // Then, sync offline database with latest data from server
              await startBackgroundOfflineSync(user.role)
              saveString(initialSyncDoneKey, "1")

              // Invalidate relevant queries to trigger UI refetch
              if (user.role === "student") {
                queryClient.invalidateQueries({ queryKey: getProjectsMyQueryKey() })
                queryClient.invalidateQueries({
                  queryKey: getClassAssignmentsForStudentQueryKey(),
                })
              } else if (user.role === "teacher") {
                queryClient.invalidateQueries({ queryKey: getProjectsMyQueryKey() })
                queryClient.invalidateQueries({ queryKey: getClassesMyQueryKey() })
              }
            } catch (error) {
              console.error("Failed to sync offline data on login:", error)
            } finally {
              setIsInitialOfflineSyncing(false)
            }
          }

          funcSync()
        }
      } else {
        previousIsLoggedInRef.current = isLoggedIn
      }
    })

    return () => {
      setIsInitialOfflineSyncing(false)
      unsubscribe()
    }
  }, [])

  // Auto-sync offline database when app comes online and user is logged in
  useEffect(() => {
    let lastNetworkState: boolean | null = null

    const networkSubscription = Network.addNetworkStateListener((state) => {
      const isConnected = state.isConnected === true
      const wasOnline = lastNetworkState
      lastNetworkState = isConnected

      // Only sync if we transitioned from offline to online
      if (isConnected && wasOnline === false) {
        const { isLoggedIn, user, token } = useAuthStore.getState()
        if (isLoggedIn && user?.role && token) {
          setIsNetworkOfflineSyncing(true)
          ;(async () => {
            try {
              // First, sync any pending uploads if they exist
              const pendingUploads = getPendingUploads()
              if (pendingUploads.length > 0) {
                await syncPendingUploads(token)
              }

              // Then, sync offline database with latest data from server
              await startBackgroundOfflineSync(user.role)

              // Invalidate relevant queries to trigger UI refetch
              if (user.role === "student") {
                // Invalidate student-specific queries
                queryClient.invalidateQueries({ queryKey: getProjectsMyQueryKey() })
                queryClient.invalidateQueries({
                  queryKey: getClassAssignmentsForStudentQueryKey(),
                })
              } else if (user.role === "teacher") {
                // Invalidate teacher-specific queries
                queryClient.invalidateQueries({ queryKey: getProjectsMyQueryKey() })
                queryClient.invalidateQueries({ queryKey: getClassesMyQueryKey() })
              }
            } catch (error) {
              console.error("Failed to sync offline data on network reconnect:", error)
            } finally {
              setIsNetworkOfflineSyncing(false)
            }
          })()
        }
      }
    })

    return () => {
      networkSubscription.remove()
    }
  }, [])

  const { top, bottom, left, right } = useSafeAreaInsets()
  if (!loaded) {
    return null
  }

  return (
    <SafeAreaProvider initialMetrics={initialWindowMetrics} style={styles.$root}>
      <ThemeProvider>
        <QueryClientProvider client={queryClient}>
          <KeyboardProvider>
            <LinearGradient
              colors={["#F4CC9C", "#FFF2E1"]}
              locations={[0.1846, 0.8345]}
              start={{ x: 1, y: 0 }}
              end={{ x: 0, y: 1 }}
              style={[
                styles.$root,
                { paddingTop: top, paddingBottom: bottom, paddingLeft: left, paddingRight: right },
              ]}
            >
              <Slot />
            </LinearGradient>
          </KeyboardProvider>
          <ToastManager
            useModal={false}
            config={{
              success: (props: any) => (
                <BaseToast
                  {...props}
                  backgroundColor={colors.background}
                  textColor={colors.text}
                  iconColor={colors.palette.green900}
                  showProgressBar={false}
                  style={styles.$toast}
                  showCloseIcon={false}
                />
              ),
              error: (props: any) => (
                <BaseToast
                  {...props}
                  backgroundColor={colors.background}
                  textColor={colors.text}
                  iconColor={colors.palette.angry500}
                  showProgressBar={false}
                  style={styles.$toast}
                  showCloseIcon={false}
                />
              ),
            }}
          />
          {isInitialOfflineSyncing && (
            <View style={styles.$syncOverlay} pointerEvents="auto">
              <ActivityIndicator size="large" color={colors.palette.primary600} />
              <Text text="データをダウンロード中…" style={styles.$syncOverlayText} />
            </View>
          )}
        </QueryClientProvider>
      </ThemeProvider>
    </SafeAreaProvider>
  )
}

const styles = StyleSheet.create({
  $root: {
    flex: 1,
  },
  $syncOverlay: {
    ...StyleSheet.absoluteFillObject,
    alignItems: "center",
    backgroundColor: "rgba(255, 255, 255, 0.92)",
    gap: moderateScale(12),
    justifyContent: "center",
    zIndex: 1000,
  },
  $syncOverlayText: {
    color: colors.palette.secondary500,
    fontFamily: "ZenKakuGothicNew-Medium",
    fontSize: moderateScale(14),
  },
  $toast: {
    borderColor: colors.palette.primary600,
    borderRadius: moderateScale(24),
    borderWidth: 1,
    elevation: 10,
    minHeight: moderateScale(60),
    padding: moderateScale(12),
    shadowColor: colors.palette.primary600,
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.9,
    shadowRadius: 10,
  },
})
