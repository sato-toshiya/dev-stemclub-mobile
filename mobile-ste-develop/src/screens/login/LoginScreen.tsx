import { useState } from "react"
import { Modal, Pressable, PressableProps, StyleSheet, TouchableOpacity, View } from "react-native"
import { LinearGradient } from "expo-linear-gradient"
import { router } from "expo-router"
import MaskedView from "@react-native-masked-view/masked-view"

import { Text, TextProps } from "@/components/Text"
import { colors } from "@/theme/colors"
import { moderateScale } from "@/theme/spacing"
import { typography } from "@/theme/typography"

import { LoginQRScreen } from "./LoginQRScreen"

function GradientButton({
  label,
  onPress,
}: {
  label: TextProps["tx"]
  onPress: PressableProps["onPress"]
}) {
  return (
    <Pressable onPress={onPress}>
      {({ pressed }) => (
        <LinearGradient
          colors={["#501794", "#3E70A1"]}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 0 }}
          style={[styles.button, pressed && styles.buttonPressed]}
        >
          <Text style={styles.buttonText} tx={label} size="sm" />
        </LinearGradient>
      )}
    </Pressable>
  )
}

export const LoginScreen = () => {
  const [isQRModalVisible, setIsQRModalVisible] = useState(false)

  return (
    <>
      <MaskedView
        style={styles.maskedView}
        maskElement={<Text tx="login:title" style={[styles.title, styles.titleVisible]} />}
      >
        <LinearGradient
          colors={["#501794", "#AE69FF"]}
          start={{ x: 0.15, y: 0 }}
          end={{ x: 1, y: 0.85 }}
          style={styles.gradient}
        >
          <Text tx="login:title" style={[styles.title, styles.titleInvisible]} />
        </LinearGradient>
      </MaskedView>
      <View style={styles.actions}>
        <GradientButton label={"login:button_QR"} onPress={() => setIsQRModalVisible(true)} />
        <GradientButton label={"login:button_code"} onPress={() => router.push("/login/pin")} />
      </View>
      <Modal
        visible={isQRModalVisible}
        supportedOrientations={["landscape-left", "landscape-right"]}
        animationType="slide"
        presentationStyle="fullScreen"
        onRequestClose={() => setIsQRModalVisible(false)}
      >
        <View style={styles.modalContainer}>
          <TouchableOpacity style={styles.closeButton} onPress={() => setIsQRModalVisible(false)}>
            <Text style={styles.closeButtonText}>✕</Text>
          </TouchableOpacity>
          <LoginQRScreen />
        </View>
      </Modal>
    </>
  )
}

const styles = StyleSheet.create({
  actions: {
    display: "flex",
    flexDirection: "column",
    gap: moderateScale(12),
    marginTop: moderateScale(48),
    width: "50%",
  },
  button: {
    alignItems: "center",
    borderRadius: 8,
    cursor: "pointer",
    display: "flex",
    justifyContent: "center",
    padding: moderateScale(12),
    width: "100%",
    zIndex: 999,
  },
  buttonPressed: { opacity: 0.8, transform: [{ scale: 0.98 }] },
  buttonText: {
    color: colors.palette.neutral100,
    fontFamily: typography.fonts.roboto.medium,
  },
  closeButton: {
    alignItems: "center",
    backgroundColor: colors.palette.black[800],
    borderRadius: 20,
    height: 40,
    justifyContent: "center",
    position: "absolute",
    right: 16,
    top: 50,
    width: 40,
    zIndex: 1000,
  },
  closeButtonText: {
    color: colors.palette.neutral100,
    fontSize: 24,
    fontWeight: "bold",
  },
  gradient: {
    minHeight: moderateScale(60),
    width: "100%",
  },
  maskedView: {
    width: "100%",
  },
  modalContainer: {
    flex: 1,
    position: "relative",
  },
  title: {
    fontFamily: typography.fonts.poppins.bold,
    fontSize: moderateScale(50),
    includeFontPadding: false,
    lineHeight: moderateScale(60),
    textAlign: "center",
  },
  titleInvisible: {
    opacity: 0,
  },
  titleVisible: {
    backgroundColor: colors.palette.transparent,
  },
})
