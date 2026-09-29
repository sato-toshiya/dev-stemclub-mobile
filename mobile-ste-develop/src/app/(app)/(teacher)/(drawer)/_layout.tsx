import { Redirect } from "expo-router"
import { Drawer } from "expo-router/drawer"

import { AppLayout } from "@/components/AppLayout"
import { Icon } from "@/components/Icon"
import { translate } from "@/i18n/translate"
import { useAuthUser } from "@/stores/auth/auth.selectors"
import { typography } from "@/theme/typography"

export default function Layout() {
  const user = useAuthUser()

  if (user?.role === "student") {
    return <Redirect href={"/(app)/(student)/(drawer)/my-works"} />
  }

  return (
    <AppLayout>
      <Drawer.Screen
        name="class-works"
        options={{
          drawerLabel: translate("menu:teacher_works"),
          drawerLabelStyle: { fontFamily: typography.fonts.zenKakuGothicNew.medium },
          drawerIcon: (props) => <Icon icon="journey" {...props} />,
        }}
      />

      {/* <Drawer.Screen
        name="class-templates"
        options={{
          drawerLabel: translate("menu:template"),
          drawerIcon: (props) => <Icon icon="paintPalette" {...props} />,
        }}
      /> */}

      <Drawer.Screen
        name="students"
        options={{
          drawerLabel: translate("menu:class_list"),
          drawerLabelStyle: { fontFamily: typography.fonts.zenKakuGothicNew.medium },
          drawerIcon: (props) => <Icon icon="people" {...props} />,
        }}
      />
    </AppLayout>
  )
}
