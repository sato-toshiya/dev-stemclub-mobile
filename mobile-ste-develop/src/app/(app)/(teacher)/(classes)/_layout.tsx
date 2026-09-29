import { View } from "react-native"
import { Redirect, Slot } from "expo-router"

import { StudentLayoutStyles as styles } from "@/app/(auth)/_layout"
import { Icon } from "@/components/Icon"
import { useAuthUser } from "@/stores/auth/auth.selectors"

export default function ClassesLayout() {
  const user = useAuthUser()

  if (user?.role === "student") {
    return <Redirect href={"/(app)/(student)/(drawer)/my-works"} />
  }
  return (
    <View style={styles.linearGradient}>
      <View style={styles.container}>
        <Slot />
      </View>
      <View style={styles.iconContainer}>
        <Icon icon="loginLeft" containerStyle={styles.iconLeft} style={styles.iconLeftImage} />
        <Icon icon="loginRight" containerStyle={styles.iconRight} style={styles.iconRightImage} />
      </View>
    </View>
  )
}
