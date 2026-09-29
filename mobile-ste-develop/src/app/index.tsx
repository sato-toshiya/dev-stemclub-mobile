import { Redirect } from "expo-router"
import { useEffect } from "react"

import { useAuthUser, useIsLoggedIn } from "@/stores/auth/auth.selectors"
import { startBackgroundOfflineSync } from "@/utils/offlineSync"

export default function Index() {
  const isLoggedIn = useIsLoggedIn()
  const user = useAuthUser()

  useEffect(() => {
    if (!isLoggedIn || !user) {
      return
    }
    startBackgroundOfflineSync(user.role)
  }, [isLoggedIn, user])

  if (!isLoggedIn || !user) {
    return <Redirect href="/login" />
  }
  return <Redirect href={user.role === "teacher" ? "/classes" : "/my-works"} />
}
