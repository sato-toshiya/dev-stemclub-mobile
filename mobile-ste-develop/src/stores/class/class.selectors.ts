import { useClassStore } from "./class.store"

export const useSelectedClass = () => useClassStore((s) => s.selectedClass)
