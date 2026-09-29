import {
  ActivityIndicator,
  Pressable,
  PressableProps,
  PressableStateCallbackType,
  StyleProp,
  TextStyle,
  View,
  ViewStyle,
} from "react-native"

import { colors } from "@/theme/colors"
import { useAppTheme } from "@/theme/context"
import { moderateScale } from "@/theme/spacing"
import { $styles } from "@/theme/styles"
import type { ThemedStyle, ThemedStyleArray } from "@/theme/types"

import { Text, TextProps } from "./Text"

type Presets = "default" | "filled" | "reversed" | "danger" | "success"

export interface ButtonAccessoryProps {
  style: StyleProp<any>
  pressableState: PressableStateCallbackType
  disabled?: boolean
}

export interface ButtonProps extends PressableProps {
  /**
   * Text which is looked up via i18n.
   */
  tx?: TextProps["tx"]
  /**
   * The text to display if not using `tx` or nested components.
   */
  text?: TextProps["text"]
  /**
   * Optional options to pass to i18n. Useful for interpolation
   * as well as explicitly setting locale or translation fallbacks.
   */
  txOptions?: TextProps["txOptions"]
  /**
   * An optional style override useful for padding & margin.
   */
  style?: StyleProp<ViewStyle>
  /**
   * An optional style override for the "pressed" state.
   */
  pressedStyle?: StyleProp<ViewStyle>
  /**
   * An optional style override for the button text.
   */
  textStyle?: StyleProp<TextStyle>
  /**
   * An optional style override for the button text when in the "pressed" state.
   */
  pressedTextStyle?: StyleProp<TextStyle>
  /**
   * An optional style override for the button text when in the "disabled" state.
   */
  disabledTextStyle?: StyleProp<TextStyle>
  /**
   * One of the different types of button presets.
   */
  preset?: Presets
  /**
   * An optional component to render on the right side of the text.
   * Example: `RightAccessory={(props) => <View {...props} />}`
   */
  RightAccessory?: React.ReactNode
  /**
   * An optional component to render on the left side of the text.
   * Example: `LeftAccessory={(props) => <View {...props} />}`
   */
  LeftAccessory?: React.ReactNode
  /**
   * Children components.
   */
  children?: React.ReactNode
  /**
   * disabled prop, accessed directly for declarative styling reasons.
   * https://reactnative.dev/docs/pressable#disabled
   */
  disabled?: boolean
  /**
   * An optional style override for the disabled state
   */
  disabledStyle?: StyleProp<ViewStyle>
  isLoading?: boolean
  shape?: "rounded" | "default"
  size?: "sm" | "lg"
}

/**
 * A component that allows users to take actions and make choices.
 * Wraps the Text component with a Pressable component.
 * @see [Documentation and Examples]{@link https://docs.infinite.red/ignite-cli/boilerplate/app/components/Button/}
 * @param {ButtonProps} props - The props for the `Button` component.
 * @returns {JSX.Element} The rendered `Button` component.
 * @example
 * <Button
 *   tx="common:ok"
 *   style={styles.button}
 *   textStyle={styles.buttonText}
 *   onPress={handleButtonPress}
 * />
 */
export function Button(props: ButtonProps) {
  const {
    tx,
    text,
    txOptions,
    style: $viewStyleOverride,
    pressedStyle: $pressedViewStyleOverride,
    textStyle: $textStyleOverride,
    pressedTextStyle: $pressedTextStyleOverride,
    disabledTextStyle: $disabledTextStyleOverride,
    children,
    RightAccessory,
    LeftAccessory,
    disabled,
    isLoading,
    shape = "default",
    size = "sm",
    disabledStyle: $disabledViewStyleOverride,
    ...rest
  } = props

  const { themed } = useAppTheme()

  const preset: Presets = props.preset ?? "default"
  /**
   * @param {PressableStateCallbackType} root0 - The root object containing the pressed state.
   * @param {boolean} root0.pressed - The pressed state.
   * @returns {StyleProp<ViewStyle>} The view style based on the pressed state.
   */
  function $viewStyle({ pressed }: PressableStateCallbackType): StyleProp<ViewStyle> {
    return [
      themed($viewPresets({ shape, size })[preset]),
      $viewStyleOverride,
      !!pressed && themed([$pressedViewPresets[preset], $pressedViewStyleOverride]),
      !!disabled && themed([$disabledViewPresets[preset], $disabledViewStyleOverride]),
    ]
  }
  /**
   * @param {PressableStateCallbackType} root0 - The root object containing the pressed state.
   * @param {boolean} root0.pressed - The pressed state.
   * @returns {StyleProp<TextStyle>} The text style based on the pressed state.
   */
  function $textStyle({ pressed }: PressableStateCallbackType): StyleProp<TextStyle> {
    return [
      themed($textPresets[preset]),
      $textStyleOverride,
      !!pressed && themed([$pressedTextPresets[preset], $pressedTextStyleOverride]),
      !!disabled && themed([$disabledTextPresets[preset], $disabledTextStyleOverride]),
    ]
  }

  return (
    <Pressable
      style={$viewStyle}
      accessibilityRole="button"
      accessibilityState={{ disabled: !!disabled }}
      {...rest}
      disabled={disabled}
    >
      {(state) => (
        <>
          <View style={themed($leftAccessoryStyle)}>{!!LeftAccessory && LeftAccessory}</View>

          {isLoading ? (
            <ActivityIndicator size="small" color={colors.text} />
          ) : (
            <Text tx={tx} text={text} txOptions={txOptions} style={$textStyle(state)}>
              {children}
            </Text>
          )}

          <View style={themed($rightAccessoryStyle)}>{!!RightAccessory && RightAccessory}</View>
        </>
      )}
    </Pressable>
  )
}

const $baseViewStyle: ({
  shape,
  size,
}: {
  shape: "rounded" | "default"
  size: "sm" | "lg"
}) => ThemedStyle<ViewStyle> =
  ({ shape, size }) =>
  ({ spacing }) => ({
    minHeight: size === "sm" ? moderateScale(33) : moderateScale(38),
    borderRadius: shape === "rounded" ? 999 : 4,
    justifyContent: "center",
    alignItems: "center",
    paddingVertical: spacing.xs,
    paddingHorizontal: spacing.xs,
    overflow: "hidden",
  })

const $baseTextStyle: ThemedStyle<TextStyle> = ({ typography }) => ({
  fontSize: moderateScale(16),
  lineHeight: moderateScale(20),
  fontFamily: typography.primary.normal,
  textAlign: "center",
  flexShrink: 1,
  flexGrow: 0,
  zIndex: 2,
})

const $rightAccessoryStyle: ThemedStyle<ViewStyle> = ({ spacing }) => ({
  marginStart: spacing.xs,
  zIndex: 1,
})
const $leftAccessoryStyle: ThemedStyle<ViewStyle> = ({ spacing }) => ({
  marginEnd: spacing.xs,
  zIndex: 1,
})

const $viewPresets: ({
  shape,
  size,
}: {
  shape: "rounded" | "default"
  size: "sm" | "lg"
}) => Record<Presets, ThemedStyleArray<ViewStyle>> = ({ shape, size }) => ({
  default: [
    $styles.row,
    $baseViewStyle({ shape, size }),
    ({ colors }) => ({
      borderWidth: 1,
      borderColor: colors.palette.neutral400,
      backgroundColor: colors.palette.neutral100,
    }),
  ],
  danger: [
    $styles.row,
    $baseViewStyle({ shape, size }),
    ({ colors }) => ({ backgroundColor: colors.palette.angry500 }),
  ],
  success: [
    $styles.row,
    $baseViewStyle({ shape, size }),
    ({ colors }) => ({ backgroundColor: colors.palette.green900 }),
  ],
  filled: [
    $styles.row,
    $baseViewStyle({ shape, size }),
    ({ colors }) => ({ backgroundColor: colors.palette.neutral300 }),
  ],
  reversed: [
    $styles.row,
    $baseViewStyle({ shape, size }),
    ({ colors }) => ({ backgroundColor: colors.palette.neutral800 }),
  ],
})

const $textPresets: Record<Presets, ThemedStyleArray<TextStyle>> = {
  default: [$baseTextStyle],
  filled: [$baseTextStyle],
  reversed: [$baseTextStyle, ({ colors }) => ({ color: colors.palette.neutral100 })],
  danger: [$baseTextStyle, ({ colors }) => ({ color: colors.palette.neutral100 })],
  success: [$baseTextStyle, ({ colors }) => ({ color: colors.palette.neutral100 })],
}

const $pressedViewPresets: Record<Presets, ThemedStyle<ViewStyle>> = {
  default: ({ colors }) => ({ backgroundColor: colors.palette.neutral200 }),
  filled: ({ colors }) => ({ backgroundColor: colors.palette.neutral400 }),
  reversed: ({ colors }) => ({ backgroundColor: colors.palette.neutral700 }),
  danger: ({ colors }) => ({ backgroundColor: colors.palette.angry500 }),
  success: ({ colors }) => ({ backgroundColor: colors.palette.green900 }),
}

const $pressedTextPresets: Record<Presets, ThemedStyle<TextStyle>> = {
  default: () => ({ opacity: 0.9 }),
  filled: () => ({ opacity: 0.9 }),
  reversed: () => ({ opacity: 0.9 }),
  danger: () => ({ opacity: 0.9 }),
  success: () => ({ opacity: 0.9 }),
}

const $disabledViewPresets: Record<Presets, ThemedStyle<ViewStyle>> = {
  default: () => ({ opacity: 0.5 }),
  filled: () => ({ opacity: 0.5 }),
  reversed: () => ({ opacity: 0.5 }),
  danger: () => ({ opacity: 0.5 }),
  success: () => ({ opacity: 0.5 }),
}

const $disabledTextPresets: Record<Presets, ThemedStyle<TextStyle>> = {
  default: () => ({ opacity: 0.5 }),
  filled: () => ({ opacity: 0.5 }),
  reversed: () => ({ opacity: 0.5 }),
  danger: () => ({ opacity: 0.5 }),
  success: () => ({ opacity: 0.5 }),
}
