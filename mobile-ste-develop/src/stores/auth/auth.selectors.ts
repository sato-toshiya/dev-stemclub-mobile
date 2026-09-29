import { useAuthStore } from "./auth.store"

export const useAuthToken = () => useAuthStore((s) => s.token)

export const useAuthUser = () => useAuthStore((s) => s.user)

export const useIsLoggedIn = () => useAuthStore((s) => s.isLoggedIn)
