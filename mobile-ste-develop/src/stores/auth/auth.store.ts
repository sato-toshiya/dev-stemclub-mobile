import { create } from "zustand"

import { loadSecureString, removeSecure, saveSecureString } from "@/utils/storage"

import { AuthActions, AuthState } from "./auth.type"

const TOKEN_KEY = "auth-token"
const USER_KEY = "auth-user"

export const useAuthStore = create<AuthState & AuthActions>((set) => ({
  token: undefined,
  user: undefined,
  isLoggedIn: false,

  login: (token, user) => {
    saveSecureString(TOKEN_KEY, token)
    saveSecureString(USER_KEY, JSON.stringify(user))

    set({ token, user, isLoggedIn: true })
  },

  logout: () => {
    removeSecure(TOKEN_KEY)
    removeSecure(USER_KEY)

    set({ token: undefined, user: undefined, isLoggedIn: false })
  },

  restore: () => {
    const token = loadSecureString(TOKEN_KEY) ?? undefined
    const userRaw = loadSecureString(USER_KEY)
    set({
      token,
      user: userRaw ? JSON.parse(userRaw) : undefined,
      isLoggedIn: !!token,
    })
  },
}))
