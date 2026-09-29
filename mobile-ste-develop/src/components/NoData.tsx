import { StyleSheet, View } from "react-native"

import { moderateScale } from "@/theme/spacing"

import { Icon } from "./Icon"
import { Text } from "./Text"

export const NoData = () => {
  return (
    <View style={styles.container}>
      <Icon icon="empty" size={moderateScale(200)} />
      <Text size="md" tx="common:empty" />
    </View>
  )
}

const styles = StyleSheet.create({
  container: {
    alignItems: "center",
    flexDirection: "column",
  },
})
