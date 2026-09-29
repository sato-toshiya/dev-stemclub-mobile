import { Redirect } from "expo-router"

export default function Templates() {
  return (
    <Redirect
      href={{
        pathname: "/scratchjr",
        params: { mode: "help" },
      }}
    />
  )
}
