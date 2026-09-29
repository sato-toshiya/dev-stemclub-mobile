import { StudentLoginStudent, TeacherLoginTeacher } from "@/client"

export interface AuthState {
  token?: string
  user?: (TeacherLoginTeacher | StudentLoginStudent) & { role: "student" | "teacher" }
  isLoggedIn: boolean
}

export interface AuthActions {
  login: (
    token: string,
    user: (TeacherLoginTeacher | StudentLoginStudent) & { role: "student" | "teacher" },
  ) => void
  logout: () => void
  restore: () => void
}
