import { Redirect } from "expo-router"

export default function ClassTemplates() {
  return (
    <Redirect
      href={{
        pathname: "/scratchjr",
        params: { mode: "help" },
      }}
    />
  )
}
