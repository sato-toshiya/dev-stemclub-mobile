import { create } from "zustand"

import { ClassMyItem } from "@/client"
import { loadSecureString, removeSecure, saveSecureString } from "@/utils/storage"

const CLASS_KEY = "selected-class"

interface ClassState {
  selectedClass?: ClassMyItem
  setClass: (classItem: ClassMyItem) => void
  clearClass: () => void
  restore: () => void
}

export const useClassStore = create<ClassState>((set) => ({
  selectedClass: undefined,

  setClass: (classItem: ClassMyItem) => {
    saveSecureString(CLASS_KEY, JSON.stringify(classItem))
    set({ selectedClass: classItem })
  },

  clearClass: () => {
    removeSecure(CLASS_KEY)
    set({ selectedClass: undefined })
  },

  restore: () => {
    const selectedClassRaw = loadSecureString(CLASS_KEY)
    set({ selectedClass: selectedClassRaw ? JSON.parse(selectedClassRaw) : undefined })
  },
}))
