import { useEffect, useState } from "react"
import NetInfo from "@react-native-community/netinfo"

/**
 * Hook to track network connectivity status
 * Returns true if device has internet connection, false otherwise
 */
export const useIsOnline = (): boolean => {
  const [isOnline, setIsOnline] = useState(true)

  useEffect(() => {
    const checkConnection = async () => {
      const state = await NetInfo.fetch()
      setIsOnline(state.isConnected === true || state.isInternetReachable === true)
    }

    // Initial check
    checkConnection()

    // Subscribe to network state changes
    const unsubscribe = NetInfo.addEventListener((state) => {
      setIsOnline(state.isConnected === true || state.isInternetReachable === true)
    })

    return () => {
      unsubscribe()
    }
  }, [])

  return isOnline
}
