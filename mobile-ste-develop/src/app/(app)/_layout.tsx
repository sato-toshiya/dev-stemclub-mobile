import { useEffect } from "react"
import { Redirect, Slot } from "expo-router"
import { useQueryClient } from "@tanstack/react-query"

import {
  getClassAssignmentsForStudentQueryKey,
  getClassesMyQueryKey,
  getProjectsMyQueryKey,
} from "@/client/@tanstack/react-query.gen"
import { useAuthUser, useIsLoggedIn } from "@/stores/auth/auth.selectors"
import { startBackgroundOfflineSync } from "@/utils/offlineSync"

export default function AppLayout() {
  const isLoggedIn = useIsLoggedIn()
  const user = useAuthUser()
  const queryClient = useQueryClient()

  useEffect(() => {
    if (!isLoggedIn || !user) {
      return
    }

    let canceled = false

    const runSync = async () => {
      await startBackgroundOfflineSync(user.role)
      if (canceled) {
        return
      }

      queryClient.invalidateQueries({ queryKey: getProjectsMyQueryKey() })
      queryClient.invalidateQueries({ queryKey: getClassesMyQueryKey() })
      queryClient.invalidateQueries({ queryKey: getClassAssignmentsForStudentQueryKey() })
    }

    runSync()
    const timer = setInterval(runSync, 30000)

    return () => {
      canceled = true
      clearInterval(timer)
    }
  }, [isLoggedIn, queryClient, user])

  if (!isLoggedIn) {
    return <Redirect href="/login" />
  }

  return <Slot />
}
