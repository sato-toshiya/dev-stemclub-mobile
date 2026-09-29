import { Pressable, StyleSheet, TouchableOpacity, View } from "react-native"
import { useRouter } from "expo-router"
import { DrawerContentComponentProps, DrawerContentScrollView } from "@react-navigation/drawer"
import { push } from "expo-router/build/global-state/routing"
import { Drawer } from "expo-router/drawer"
import { Toast } from "toastify-react-native"

import { Button } from "@/components/Button"
import { Icon } from "@/components/Icon"
import { Text } from "@/components/Text"
import { useAuthUser } from "@/stores/auth/auth.selectors"
import { useAuthStore } from "@/stores/auth/auth.store"
import { useClassStore } from "@/stores/class/class.store"
import { colors } from "@/theme/colors"
import { moderateScale } from "@/theme/spacing"
import { typography } from "@/theme/typography"
import { useIsOnline } from "@/utils/useIsOnline"
import { translate } from "@/i18n/translate"

import { ClassSelect } from "./classes/ClassSelect"

function CustomDrawerContent(props: DrawerContentComponentProps) {
  const router = useRouter()
  const logout = useAuthStore((state) => state.logout)
  const clearClass = useClassStore((state) => state.clearClass)
  const isOnline = useIsOnline()

  const handleLogout = () => {
    if (!isOnline) {
      Toast.error(translate("login:offline_cannot_logout"))
      return
    }
    logout()
    clearClass()
    router.replace("/login")
  }

  return (
    <View style={styles.drawerContainer}>
      <DrawerContentScrollView
        {...props}
        bounces={false}
        style={styles.drawer}
        contentContainerStyle={styles.drawerContentContainer}
        scrollEnabled={true}
        showsVerticalScrollIndicator={false}
        keyboardShouldPersistTaps="handled"
      >
        <View style={styles.drawerItems}>
          {props.state.routes.map((route, index) => {
            const focused = props.state.index === index
            const options = props.descriptors[route.key].options
            return (
              <TouchableOpacity
                key={route.key}
                style={[
                  styles.drawerItem,
                  options.drawerItemStyle,
                  focused && styles.drawerItemFocused,
                ]}
                onPress={() => props.navigation.navigate(route.name)}
              >
                <View style={styles.drawerIcon}>
                  {options?.drawerIcon?.({
                    focused,
                    size: 57,
                    color: undefined as any,
                  })}
                </View>

                <Text style={styles.drawerLabel} text={options.drawerLabel as string} />
              </TouchableOpacity>
            )
          })}
        </View>
      </DrawerContentScrollView>

      <TouchableOpacity
        style={[styles.logoutButton, !isOnline && styles.logoutButtonDisabled]}
        onPress={handleLogout}
        disabled={!isOnline}
      >
        <Icon icon="logout" size={moderateScale(18)} />
        <Text style={styles.logoutText} text="logout" />
      </TouchableOpacity>
    </View>
  )
}

export const AppLayout = ({ children }: { children: React.ReactNode }) => {
  const router = useRouter()
  const user = useAuthUser()
  const handleNewProject = () => {
    router.push({
      pathname: "/scratchjr",
      params: { mode: "new" },
    })
  }

  const handleOpenHelp = () => {
    router.push({
      pathname: "/scratchjr",
      params: { mode: "help" },
    })
  }

  return (
    <View style={styles.linearGradient}>
      <View style={styles.container}>
        <View style={styles.header}>
          <View style={styles.headerLeft}>
            <Icon icon="home" style={{ width: moderateScale(32), height: moderateScale(24) }} />

            <Text
              tx="home:hello_text"
              txOptions={{
                name: user?.name ?? "",
              }}
              style={styles.helloText}
            />
          </View>
          {user?.role === "teacher" && <ClassSelect />}

          <View style={styles.headerButtons}>
            <Button
              tx="home:template_button"
              preset="danger"
              textStyle={{ fontFamily: typography.fonts.zenKakuGothicNew.normal }}
              LeftAccessory={
                <Icon
                  icon="image"
                  style={{ width: moderateScale(24), height: moderateScale(24) }}
                />
              }
              shape="rounded"
              onPress={handleOpenHelp}
            />
            <Button
              tx="home:new_button"
              preset="success"
              textStyle={{ fontFamily: typography.fonts.zenKakuGothicNew.normal }}
              LeftAccessory={
                <Icon icon="sun" style={{ width: moderateScale(24), height: moderateScale(24) }} />
              }
              shape="rounded"
              onPress={handleNewProject}
            />
          </View>
        </View>
        <Drawer
          drawerContent={(props) => <CustomDrawerContent {...props} />}
          screenOptions={{
            drawerType: "permanent",
            sceneStyle: {
              backgroundColor: "transparent",
              ...styles.screenLayout,
            },

            headerShown: false,
            headerLeft: () => null,
            swipeEnabled: false,
            drawerContentStyle: styles.drawerContent,
            drawerContentContainerStyle: { padding: 0, margin: 0 },
            drawerStyle: {
              width: moderateScale(122),
              borderRightWidth: 0,
              borderRadius: 8,
              backgroundColor: colors.palette.blue.DEFAULT,
              marginBottom: moderateScale(160),
              shadowColor: colors.palette.black.DEFAULT,
              shadowOffset: { width: 0, height: 2 },
              shadowOpacity: 0.12,
              shadowRadius: 3,
            },
          }}
        >
          {children}
        </Drawer>

        <Pressable
          onPress={() => {
            if (user?.role === "teacher") {
              push("/classes")
            }
          }}
        >
          <Icon icon="backClass" style={styles.logo} />
        </Pressable>
      </View>
    </View>
  )
}
const styles = StyleSheet.create({
  container: {
    flex: 1,
    position: "relative",
  },
  drawer: {
    flex: 1,
    padding: 0,
  },
  drawerContainer: {
    flex: 1,
    flexDirection: "column",
  },
  drawerContent: {
    elevation: 1,
    flex: 1,
    paddingHorizontal: 0,
    padding: 0,
    paddingVertical: 0,
    shadowColor: colors.palette.black.DEFAULT,
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.08,
    shadowRadius: 1,
  },
  drawerContentContainer: {
    flexGrow: 1,
    marginLeft: 0,
    paddingBottom: moderateScale(18),
    paddingEnd: 0,
    paddingStart: 0,
    paddingTop: moderateScale(18),
  },
  drawerIcon: {
    marginBottom: 8,
  },
  drawerItem: {
    alignItems: "center",
    flexDirection: "column",
    justifyContent: "center",
    margin: 0,
    marginHorizontal: 0,
    marginVertical: 0,
    paddingHorizontal: moderateScale(20),
    paddingVertical: moderateScale(10),
    width: "100%",
  },
  drawerItemFocused: {
    backgroundColor: colors.palette.accent200,
  },
  drawerItems: {
    flex: 1,
  },
  drawerLabel: {
    color: colors.text,
    fontFamily: typography.fonts.zenKakuGothicNew.medium,
    fontSize: moderateScale(10),
    textAlign: "center",
  },
  header: {
    alignItems: "center",
    backgroundColor: colors.palette.accent50,
    borderRadius: 999,
    flexDirection: "row",
    height: moderateScale(70),
    justifyContent: "space-between",
    marginBottom: moderateScale(30),
    marginHorizontal: moderateScale(50),
    paddingHorizontal: moderateScale(50),
    paddingVertical: moderateScale(12),
  },
  headerButtons: {
    flexDirection: "row",
    gap: 20,
  },
  headerLeft: {
    alignItems: "center",
    flexDirection: "row",
    gap: moderateScale(28),
  },
  helloText: {
    fontFamily: typography.fonts.zenKakuGothicNew.normal,
  },
  linearGradient: {
    flex: 1,
    marginTop: moderateScale(20),
  },
  logo: {
    bottom: moderateScale(6),
    height: moderateScale(121),
    left: moderateScale(4),
    position: "absolute",
    width: moderateScale(114),
  },
  logoutButton: {
    alignItems: "center",
    flexDirection: "row",
    gap: moderateScale(16),
    justifyContent: "center",
    paddingBottom: moderateScale(18),
    paddingHorizontal: moderateScale(20),
    paddingTop: moderateScale(18),
  },
  logoutButtonDisabled: {
    opacity: 0.5,
  },
  logoutText: {
    color: colors.text,
    fontFamily: typography.fonts.zenKakuGothicNew.normal,
    fontSize: moderateScale(14),
    textAlign: "center",
  },
  screenLayout: { flex: 1, paddingHorizontal: moderateScale(50) },
})
