import { StyleSheet, View } from "react-native"
import { Redirect, Slot } from "expo-router"

import { Icon } from "@/components/Icon"
import { useIsLoggedIn } from "@/stores/auth/auth.selectors"
import { moderateScale } from "@/theme/spacing"

export default function AuthLayout() {
  const isLoggedIn = useIsLoggedIn()
  if (isLoggedIn) return <Redirect href={"/"} />

  return (
    <View style={StudentLayoutStyles.linearGradient}>
      <View style={StudentLayoutStyles.container}>
        <Slot />
      </View>
      <View style={StudentLayoutStyles.iconContainer}>
        <Icon
          icon="loginLeft"
          containerStyle={StudentLayoutStyles.iconLeft}
          style={StudentLayoutStyles.iconLeftImage}
        />
        <Icon
          icon="loginRight"
          containerStyle={StudentLayoutStyles.iconRight}
          style={StudentLayoutStyles.iconRightImage}
        />
      </View>
    </View>
  )
}

export const StudentLayoutStyles = StyleSheet.create({
  container: {
    alignItems: "center",
    flex: 1,
    flexDirection: "column",
    justifyContent: "center",
    marginHorizontal: "auto",
    marginVertical: 0,
    zIndex: 9999,
  },
  iconContainer: {
    bottom: 0,
    flexDirection: "row",
    justifyContent: "space-between",
    left: 0,
    position: "absolute",
    width: "100%",
  },

  iconLeft: {
    bottom: 0,
    left: 0,
    position: "absolute",
  },
  iconLeftImage: {
    height: moderateScale(323),
    width: moderateScale(340),
  },
  iconRight: { bottom: 0, position: "absolute", right: 0 },
  iconRightImage: {
    height: moderateScale(321),
    width: moderateScale(307),
  },
  linearGradient: {
    flex: 1,
  },
})
