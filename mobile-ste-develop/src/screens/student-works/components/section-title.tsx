import { StyleSheet, View } from "react-native"

import { Icon } from "@/components/Icon"
import { Text } from "@/components/Text"
import { moderateScale } from "@/theme/spacing"
import { typography } from "@/theme/typography"

export const StudentAssignedWorksTitle = () => {
  return (
    <View style={styles.sectionHeader}>
      <View style={styles.titleView}>
        <Icon icon="layoutGrid" size={moderateScale(24)} color="#59C9DFCC" />
        <Text
          tx="works:lessons_from_teacher"
          size="sm"
          style={{ fontFamily: typography.fonts.zenKakuGothicNew.semiBold }}
        />
      </View>
    </View>
  )
}

export const StudentMyWorksTitle = () => {
  return (
    <View style={[styles.sectionHeader, { marginTop: moderateScale(40) }]}>
      <View style={styles.titleView}>
        <Icon icon="stars" size={moderateScale(24)} color="#FF79D7" />
        <Text
          tx="works:my_own_work"
          size="sm"
          style={{ fontFamily: typography.fonts.zenKakuGothicNew.semiBold }}
        />
      </View>
    </View>
  )
}

const styles = StyleSheet.create({
  sectionHeader: {
    alignItems: "center",
    flexDirection: "row",
    justifyContent: "space-between",
  },

  titleView: {
    alignItems: "center",
    flexDirection: "row",
    gap: moderateScale(8),
  },
})
