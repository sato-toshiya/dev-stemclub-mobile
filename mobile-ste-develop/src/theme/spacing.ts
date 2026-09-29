import { Dimensions } from "react-native"

export const { width: DEVICE_WIDTH, height: DEVICE_HEIGHT } = Dimensions.get("window")

//Guideline sizes are based on standard ~5" screen mobile device
const guidelineBaseWidth = 1024
const guidelineBaseHeight = 1366

const scale = (size: number): number => (DEVICE_WIDTH / guidelineBaseWidth) * size
const verticalScale = (size: number): number => (DEVICE_HEIGHT / guidelineBaseHeight) * size
const moderateScale = (size: number, factor = 0.5): number => size + (scale(size) - size) * factor

export { moderateScale, scale, verticalScale }
/**
  Use these spacings for margins/paddings and other whitespace throughout your app.
 */
export const spacing = {
  xxxs: moderateScale(2),
  xxs: moderateScale(4),
  xs: moderateScale(8),
  sm: moderateScale(12),
  md: moderateScale(16),
  lg: moderateScale(24),
  xl: moderateScale(32),
  xxl: moderateScale(48),
  xxxl: moderateScale(64),
} as const
