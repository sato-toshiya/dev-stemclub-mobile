import { ActivityIndicator, StyleSheet, View } from "react-native"

import { colors } from "@/theme/colors"

export const LoadingMask = ({ visible }: { visible: boolean }) => {
  return visible ? (
    <View style={styles.loadingOverlay}>
      <ActivityIndicator size="large" color={colors.palette.primary600} />
    </View>
  ) : null
}

const styles = StyleSheet.create({
  loadingOverlay: {
    ...StyleSheet.absoluteFillObject,
    alignItems: "center",
    backgroundColor: colors.palette.neutral100,
    justifyContent: "center",
    opacity: 0.1,
    zIndex: 1000,
  },
})
