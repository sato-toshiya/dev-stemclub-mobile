import { useState } from "react"
import { ActivityIndicator, StyleSheet, View } from "react-native"
import { CameraView, useCameraPermissions, type BarcodeScanningResult } from "expo-camera"
import * as Linking from "expo-linking"
import { router } from "expo-router"
import { useMutation } from "@tanstack/react-query"
import { SafeAreaView, useSafeAreaInsets } from "react-native-safe-area-context"

import { postStudentsLoginByQrMutation } from "@/client/@tanstack/react-query.gen"
import { Button } from "@/components/Button"
import { Text } from "@/components/Text"
import { translate } from "@/i18n/translate"
import { useAuthStore } from "@/stores/auth/auth.store"
import { colors } from "@/theme/colors"
import { startBackgroundOfflineSync } from "@/utils/offlineSync"

const QR_HIGHLIGHT_COLOR = colors.palette.primary700
const APP_NAME = "すてむくらぶ"

export const LoginQRScreen = () => {
  const [permission, requestPermission] = useCameraPermissions()
  const [isRequesting, setIsRequesting] = useState(false)
  const [cornerPoints, setCornerPoints] = useState<BarcodeScanningResult["cornerPoints"]>([])
  const [errorMessage, setErrorMessage] = useState<string | null>(null)
  const { login } = useAuthStore()
  const { top, bottom, left, right } = useSafeAreaInsets()

  const { mutate, isPending } = useMutation({
    ...postStudentsLoginByQrMutation(),
  })

  const handleBarCodeScanned = (result: BarcodeScanningResult) => {
    if (result.cornerPoints && result.cornerPoints.length > 0) {
      setCornerPoints(result.cornerPoints)
    }
    if (!isPending && !errorMessage) {
      mutate(
        {
          body: {
            token: result.data,
          },
        },
        {
          onSuccess: (data) => {
            login(data.jwt, {
              ...data.student,
              role: "student",
            })
            startBackgroundOfflineSync("student")
            router.push("/my-works")
          },
          onError: (error) => {
            const message =
              error.status === 401
                ? translate("error:unauthorized")
                : error.status === 403
                  ? translate("error:forbidden")
                  : translate("error:error_message_default")
            setErrorMessage(message)
            setCornerPoints([])
          },
        },
      )
    }
  }

  const handleRequestPermission = async () => {
    try {
      setIsRequesting(true)
      await requestPermission()
    } catch {
    } finally {
      setIsRequesting(false)
    }
  }

  if (!permission) {
    return (
      <View style={styles.container}>
        <ActivityIndicator size="large" />
      </View>
    )
  }

  if (!permission.granted) {
    return (
      <SafeAreaView
        style={[
          styles.container,
          { paddingTop: top, paddingBottom: bottom, paddingLeft: left, paddingRight: right },
        ]}
      >
        <Text
          style={styles.message}
          text={`現在、${APP_NAME}にはカメラへのアクセス権が付与されていません。${APP_NAME}は、安全にログインするためにQRコードをスキャンする目的でカメラを使用します。カメラはスキャン時にのみ使用され、画像や動画が保存されることはありません。`}
        />

        {permission.canAskAgain ? (
          <Button
            onPress={handleRequestPermission}
            text={isRequesting ? "読み込み中..." : "続ける"}
            disabled={isRequesting}
            isLoading={isRequesting}
          />
        ) : (
          <Button onPress={() => Linking.openSettings()} text="設定を開く" />
        )}
      </SafeAreaView>
    )
  }

  return (
    <SafeAreaView style={styles.fullContainer}>
      <View style={styles.cameraContainer}>
        <CameraView
          style={styles.fullContainer}
          facing={"back"}
          onBarcodeScanned={handleBarCodeScanned}
          barcodeScannerSettings={{
            barcodeTypes: ["qr"],
          }}
        />
        {cornerPoints.length >= 2 && (
          <View style={styles.overlay} pointerEvents="none">
            {cornerPoints.map((point, index) => {
              const nextPoint = cornerPoints[(index + 1) % cornerPoints.length]
              const dx = nextPoint.x - point.x
              const dy = nextPoint.y - point.y
              const length = Math.sqrt(dx * dx + dy * dy)
              const angle = Math.atan2(dy, dx) * (180 / Math.PI)

              return (
                <View
                  key={`line-${index}`}
                  style={[
                    styles.line,
                    {
                      left: point.x,
                      top: point.y,
                      width: length,
                      transform: [{ rotate: `${angle}deg` }],
                    },
                  ]}
                />
              )
            })}
          </View>
        )}
        {isPending && (
          <View style={styles.loadingOverlay}>
            <ActivityIndicator size="large" color={colors.palette.primary700} />
            <Text style={styles.loadingText} tx="login:logging" />
          </View>
        )}
        {errorMessage && (
          <View style={styles.errorOverlay}>
            <View style={styles.errorContainer}>
              <Text style={styles.errorTitle} tx="login:login_error" size="xl" />
              <Text style={styles.errorMessage} text={errorMessage} size="xl" />
              <Button
                onPress={() => {
                  setErrorMessage(null)
                  setCornerPoints([])
                }}
                tx={"common:retry"}
              />
            </View>
          </View>
        )}
      </View>
    </SafeAreaView>
  )
}

const styles = StyleSheet.create({
  cameraContainer: {
    flex: 1,
    position: "relative",
  },

  container: {
    flex: 1,
    justifyContent: "center",
  },
  errorContainer: {
    alignItems: "center",
    backgroundColor: colors.palette.neutral100,
    borderRadius: 16,
    padding: 24,
    width: "85%",
  },
  errorMessage: {
    color: colors.palette.neutral800,
    fontSize: 14,
    marginBottom: 20,
    marginTop: 12,
    textAlign: "center",
  },
  errorOverlay: {
    ...StyleSheet.absoluteFillObject,
    alignItems: "center",
    backgroundColor: colors.palette.black[800],
    justifyContent: "center",
    zIndex: 3,
  },
  errorTitle: {
    color: colors.palette.angry500,
    fontSize: 20,
    fontWeight: "600",
  },
  fullContainer: {
    flex: 1,
  },
  line: {
    backgroundColor: QR_HIGHLIGHT_COLOR,
    height: 3,
    position: "absolute",
    transformOrigin: "left center",
  },
  loadingOverlay: {
    ...StyleSheet.absoluteFillObject,
    alignItems: "center",
    backgroundColor: colors.palette.black[800],
    justifyContent: "center",
    zIndex: 2,
  },
  loadingText: {
    color: colors.palette.neutral100,
    fontSize: 16,
    marginTop: 16,
  },
  message: {
    paddingBottom: 10,
    textAlign: "center",
  },
  overlay: {
    ...StyleSheet.absoluteFillObject,
    zIndex: 1,
  },
})
