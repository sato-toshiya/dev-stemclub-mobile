import { router } from "expo-router"

import { client } from "@/client/client.gen"
import { useAuthStore } from "@/stores/auth/auth.store"
import { useClassStore } from "@/stores/class/class.store"

export function setupHeyapiClient() {
  client.instance.interceptors.request.use(async (config) => {
    const { token } = useAuthStore.getState()
    if (token) {
      config.headers.Authorization = `Bearer ${token}`
    }

    return config
  })

  client.instance.interceptors.response.use(
    (response) => response,
    async (error) => {
      if (error.response?.status === 401) {
        const requestUrl = error.config?.url || ""
        const isLoginEndpoint =
          requestUrl.includes("/students/login-by-qr") ||
          requestUrl.includes("/teachers/login-by-passcode")

        if (!isLoginEndpoint) {
          useAuthStore.getState().logout()
          useClassStore.getState().clearClass()
          router.replace("/login")
        }
      }
      return Promise.reject(error)
    },
  )
}
