import { NativeModules, Platform } from "react-native"
import Constants from "expo-constants"

/**
 * Get local bundle URL for Python webview (production)
 */
export function getPythonLocalBundleUrl(mode?: "index" | "player"): string | null {
  let basePath: string
  if (mode === "player") {
    basePath = "player.html"
  } else {
    basePath = "index.html"
  }

  if (Platform.OS === "android") {
    return `file:///android_asset/python/${basePath}`
  } else if (Platform.OS === "ios") {
    const isProduction = !__DEV__ || Constants.executionEnvironment === "storeClient"
    if (isProduction) {
      return `python/${basePath}`
    }
    return null
  } else if (Platform.OS === "web") {
    if (typeof window !== "undefined") {
      return `${window.location.origin}/python/${basePath}`
    }
  }
  return null
}

/**
 * Derive packager URL for Python webview (development)
 */
export function derivePythonPackagerUrl(mode?: "index" | "player"): string | null {
  let basePath: string
  if (mode === "player") {
    basePath = "player.html"
  } else {
    basePath = "index.html"
  }

  if (Platform.OS === "web" && typeof window !== "undefined") {
    return `${window.location.origin}/python/${basePath}`
  }

  const buildUrl = (host: string, scheme: string) => `${scheme}://${host}/python/${basePath}`

  if (Constants.debuggerHost) {
    const [host, port] = Constants.debuggerHost.split(":")
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
        const url = buildUrl(parsed.host, scheme)
        return url
      }
    } catch {}
  }

  if (Constants.expoConfig?.hostUri) {
    try {
      const hostUri = Constants.expoConfig.hostUri
      const url = buildUrl(hostUri, "http")
      return url
    } catch {}
  }

  const fallbackHosts = ["localhost:8081", "127.0.0.1:8081"]
  const fallbackUrl = buildUrl(fallbackHosts[0], "http")

  return fallbackUrl
}

/**
 * Get Python webview source URL (handles both development and production)
 */
export function getPythonWebViewSource(mode?: "index" | "player"): { uri: string } | null {
  // In production builds (APK/AAB), always use local bundle
  // Only use Metro bundler in development mode when explicitly running dev server
  const isProduction = !__DEV__ || Constants.executionEnvironment === "storeClient"
  const isDevServerAvailable = __DEV__ && Constants.debuggerHost

  if (!isProduction && isDevServerAvailable) {
    const derivedUrl = derivePythonPackagerUrl(mode)
    if (derivedUrl && !derivedUrl.includes("localhost") && !derivedUrl.includes("127.0.0.1")) {
      return { uri: derivedUrl }
    }
  }

  // Always try local bundle first, especially in production
  const localUrl = getPythonLocalBundleUrl(mode)

  if (localUrl) {
    return { uri: localUrl }
  }

  // Fallback to Metro only if local bundle is not available AND we're in dev mode
  if (!isProduction && isDevServerAvailable) {
    const derivedUrl = derivePythonPackagerUrl(mode)
    if (derivedUrl) {
      return { uri: derivedUrl }
    }
  }

  return null
}
