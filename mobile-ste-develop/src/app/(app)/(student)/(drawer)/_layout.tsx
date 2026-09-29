import { Redirect } from "expo-router"
import { Drawer } from "expo-router/drawer"

import { AppLayout } from "@/components/AppLayout"
import { Icon } from "@/components/Icon"
import { useAuthUser } from "@/stores/auth/auth.selectors"
import { useStudentPresence } from "@/utils/useStudentPresense"

export default function StudentLayout() {
  const user = useAuthUser()
  useStudentPresence()

  if (user?.role === "teacher") {
    return <Redirect href={"/(app)/(teacher)/(drawer)/class-works"} />
  }

  return (
    <AppLayout>
      <Drawer.Screen
        name="my-works"
        options={{
          drawerLabel: "じぶんのさくひん",
          drawerIcon: (props) => <Icon icon="journey" {...props} />,
        }}
      />
      {/* <Drawer.Screen
        name="templates"
        options={{
          drawerLabel: "てんぷれーと",
          drawerIcon: (props) => <Icon icon="paintPalette" {...props} />,
        }}
      /> */}
    </AppLayout>
  )
}
