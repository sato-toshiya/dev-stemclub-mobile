import { useCallback, useEffect, useRef, useState } from "react"
import {
  Animated,
  Pressable,
  ScrollView,
  StyleProp,
  StyleSheet,
  TouchableOpacity,
  View,
  ViewStyle,
} from "react-native"
import { LinearGradient } from "expo-linear-gradient"
import { router } from "expo-router"
import MaskedView from "@react-native-masked-view/masked-view"
import { useMutation } from "@tanstack/react-query"
import { Toast } from "toastify-react-native"

import { postTeachersLoginByPasscodeMutation } from "@/client/@tanstack/react-query.gen"
import { LoadingMask } from "@/components/LoadingMask"
import { Text } from "@/components/Text"
import { translate } from "@/i18n/translate"
import { useIsLoggedIn } from "@/stores/auth/auth.selectors"
import { useAuthStore } from "@/stores/auth/auth.store"
import { colors } from "@/theme/colors"
import { moderateScale } from "@/theme/spacing"
import { typography } from "@/theme/typography"
import { startBackgroundOfflineSync } from "@/utils/offlineSync"

const PIN_LENGTH = 6

export default function LoginPinScreen() {
  const { login } = useAuthStore()
  const isLoggedIn = useIsLoggedIn()
  const [pin, setPin] = useState("")
  const shakeAnim = useRef(new Animated.Value(0)).current
  const hasCalledLogin = useRef(false)

  const { mutate, isPending } = useMutation({
    ...postTeachersLoginByPasscodeMutation(),
  })

  const handlePress = (value: string) => {
    if (pin.length < PIN_LENGTH && !isPending) {
      setPin(pin + value)
    }
  }

  const handleDelete = () => {
    if (!isPending) {
      setPin(pin.slice(0, -1))
    }
  }

  const triggerShake = useCallback(() => {
    Animated.sequence([
      Animated.timing(shakeAnim, {
        toValue: 10,
        duration: 50,
        useNativeDriver: true,
      }),
      Animated.timing(shakeAnim, {
        toValue: -10,
        duration: 50,
        useNativeDriver: true,
      }),
      Animated.timing(shakeAnim, {
        toValue: 6,
        duration: 50,
        useNativeDriver: true,
      }),
      Animated.timing(shakeAnim, {
        toValue: -6,
        duration: 50,
        useNativeDriver: true,
      }),
      Animated.timing(shakeAnim, {
        toValue: 0,
        duration: 50,
        useNativeDriver: true,
      }),
    ]).start()
  }, [shakeAnim])

  const handleLogin = useCallback(async () => {
    if (hasCalledLogin.current || isPending) return
    hasCalledLogin.current = true

    mutate(
      {
        body: {
          passcode: pin,
        },
      },
      {
        onSuccess: (data) => {
          login(data.jwt, {
            ...data.teacher,
            role: "teacher",
          })
          startBackgroundOfflineSync("teacher")
          setPin("")
          hasCalledLogin.current = false
          router.push("/classes")
        },
        onError: (error) => {
          const message =
            error.status === 401
              ? translate("error:unauthorized")
              : error.status === 403
                ? translate("error:forbidden")
                : translate("error:error_message_default")
          Toast.error(message)
          triggerShake()
          setPin("")
          hasCalledLogin.current = false
        },
      },
    )
  }, [pin, isPending, triggerShake])

  useEffect(() => {
    if (isLoggedIn) return
    if (isPending) return
    if (pin.length === PIN_LENGTH && !hasCalledLogin.current) {
      handleLogin()
    }
  }, [pin, isPending, isLoggedIn, handleLogin])

  return (
    <ScrollView contentContainerStyle={styles.scrollView} showsVerticalScrollIndicator={false}>
      <LoadingMask visible={isPending} />
      <MaskedView
        style={styles.maskedView}
        maskElement={
          <Text tx="login:login_pin_label" style={[styles.title, styles.titleVisible]} />
        }
      >
        <LinearGradient
          colors={["#501794", "#AE69FF"]}
          start={{ x: 0.15, y: 0 }}
          end={{ x: 1, y: 0.85 }}
          style={styles.gradient}
        >
          <Text tx="login:login_pin_label" style={[styles.title, styles.titleInvisible]} />
        </LinearGradient>
      </MaskedView>

      <Animated.View style={{ transform: [{ translateX: shakeAnim }] }}>
        <View style={styles.pinBox}>
          {Array.from({ length: PIN_LENGTH }).map((_, i) => (
            <Text key={i} style={styles.pinDigit}>
              {pin[i] ?? "."}
            </Text>
          ))}
        </View>
      </Animated.View>

      <View style={styles.keypad}>
        {[1, 2, 3, 4, 5, 6, 7, 8, 9].map((keyText) => (
          <Key
            key={keyText}
            label={String(keyText)}
            onPress={() => handlePress(String(keyText))}
            disabled={isPending}
          />
        ))}

        <Key label="↵" style={styles.hiddenKey} onPress={() => {}} />

        <Key label="0" onPress={() => handlePress("0")} disabled={isPending} />
        <Key label="⌫" onPress={handleDelete} disabled={isPending} />
      </View>

      <Pressable
        style={({ pressed }) => [styles.backButton, pressed && styles.backButtonPressed]}
        onPress={() => router.back()}
      >
        <Text style={styles.backButtonText}>もどる</Text>
      </Pressable>
    </ScrollView>
  )
}

function Key({
  label,
  onPress,
  style,
  disabled,
}: {
  label: string
  onPress: () => void
  style?: StyleProp<ViewStyle>
  disabled?: boolean
}) {
  return (
    <TouchableOpacity
      style={[styles.key, style, disabled && styles.keyDisabled]}
      onPress={onPress}
      disabled={disabled}
    >
      <Text style={[styles.keyText, disabled && styles.keyTextDisabled]}>{label}</Text>
    </TouchableOpacity>
  )
}

const styles = StyleSheet.create({
  backButton: {
    alignItems: "center",
    borderColor: colors.palette.primary600,
    borderRadius: 8,
    borderWidth: 1,
    marginTop: moderateScale(20),
    paddingHorizontal: moderateScale(24),
    paddingVertical: moderateScale(10),
  },
  backButtonPressed: {
    opacity: 0.7,
    transform: [{ scale: 0.96 }],
  },
  backButtonText: {
    color: colors.palette.primary600,
    fontFamily: typography.fonts.poppins.bold,
    fontSize: moderateScale(16),
  },
  gradient: {
    minHeight: moderateScale(60),
    width: "100%",
  },
  hiddenKey: {
    opacity: 0,
  },
  key: {
    alignItems: "center",
    height: moderateScale(72),
    justifyContent: "center",
    width: moderateScale(61),
  },
  keyDisabled: {
    opacity: 0.5,
  },
  keyText: {
    color: colors.palette.neutral100,
    fontSize: moderateScale(48),
    lineHeight: moderateScale(48),
  },
  keyTextDisabled: {
    opacity: 0.5,
  },
  keypad: {
    borderColor: colors.palette.violet[800],
    borderRadius: 16,
    borderStyle: "dashed",
    borderWidth: 1,
    flexDirection: "row",
    flexWrap: "wrap",
    justifyContent: "space-between",
    padding: moderateScale(20),
    width: moderateScale(270),
  },
  maskedView: {
    width: "100%",
  },
  pinBox: {
    backgroundColor: colors.palette.neutral100,
    borderRadius: 999,
    flexDirection: "row",
    marginBottom: moderateScale(16),
    paddingHorizontal: moderateScale(40),
    paddingVertical: moderateScale(12),
  },
  pinDigit: {
    fontSize: moderateScale(44),
    includeFontPadding: false,
    lineHeight: moderateScale(50),
    marginHorizontal: moderateScale(12),
    minWidth: moderateScale(30),
    textDecorationLine: "underline",
  },
  scrollView: {
    alignItems: "center",
    flexGrow: 1,
    justifyContent: "center",
  },
  title: {
    fontFamily: typography.fonts.poppins.bold,
    fontSize: moderateScale(16),
    includeFontPadding: false,
    lineHeight: moderateScale(24),
    textAlign: "center",
  },
  titleInvisible: {
    opacity: 0,
  },
  titleVisible: {
    backgroundColor: colors.palette.transparent,
  },
})
