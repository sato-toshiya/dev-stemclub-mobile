import { ReactNode } from "react"
import { StyleProp, View, ViewStyle } from "react-native"

import { colors } from "@/theme/colors"
import { useAppTheme } from "@/theme/context"
import { moderateScale, spacing } from "@/theme/spacing"

export interface ProjectCardProps {
  children?: ReactNode

  style?: StyleProp<ViewStyle>
}

export function ProjectCard(props: ProjectCardProps) {
  const { children, style } = props
  const { theme } = useAppTheme()

  return (
    <View
      style={[
        $cardStyle,
        {
          backgroundColor: theme.colors.background,
        },
        style,
      ]}
    >
      {children}
    </View>
  )
}

const $cardStyle: ViewStyle = {
  borderRadius: spacing.xs,
  padding: spacing.md,
  shadowColor: colors.palette.black.DEFAULT,
  shadowOffset: {
    width: 0,
    height: 4,
  },
  shadowOpacity: 0.08,
  shadowRadius: moderateScale(4),
  elevation: 3,
}
