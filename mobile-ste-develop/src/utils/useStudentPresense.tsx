import { useEffect, useRef } from "react"
import { AppState, AppStateStatus } from "react-native"
import NetInfo from "@react-native-community/netinfo"

import { postStudentsMarkSeen } from "@/client"
import { useAuthUser } from "@/stores/auth/auth.selectors"

const HEARTBEAT_INTERVAL = 30_000 // 30s

export const useStudentPresence = () => {
  const user = useAuthUser()
  const appState = useRef<AppStateStatus>(AppState.currentState)
  const internet = useRef<boolean>(false)
  const heartbeatRef = useRef<number | null>(null)

  const isStudent = user?.role === "student"

  useEffect(() => {
    if (!isStudent) return

    const canHeartbeat = () => appState.current === "active" && internet.current === true

    const startHeartbeat = () => {
      if (heartbeatRef.current) return

      postStudentsMarkSeen({
        body: {
          status: "online",
        },
      })

      heartbeatRef.current = setInterval(() => {
        postStudentsMarkSeen()
      }, HEARTBEAT_INTERVAL)
    }

    const stopHeartbeat = () => {
      if (!heartbeatRef.current) return

      clearInterval(heartbeatRef.current)
      heartbeatRef.current = null

      postStudentsMarkSeen({
        body: {
          status: "offline",
        },
      })
    }

    const sync = () => {
      if (canHeartbeat()) {
        startHeartbeat()
      } else {
        stopHeartbeat()
      }
    }

    const netSub = NetInfo.addEventListener((state) => {
      internet.current = state.isInternetReachable === true
      sync()
    })

    const appSub = AppState.addEventListener("change", (state) => {
      appState.current = state
      sync()
    })

    return () => {
      netSub()
      appSub.remove()
      stopHeartbeat()
    }
  }, [isStudent])
}
