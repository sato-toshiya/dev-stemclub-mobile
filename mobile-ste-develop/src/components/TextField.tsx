import { forwardRef, Ref, useImperativeHandle, useRef } from "react"
import {
  ImageStyle,
  StyleProp,
  // eslint-disable-next-line no-restricted-imports
  TextInput,
  TextInputProps,
  TextStyle,
  TouchableOpacity,
  View,
  ViewStyle,
} from "react-native"

import { isRTL } from "@/i18n"
import { translate } from "@/i18n/translate"
import { colors } from "@/theme/colors"
import { useAppTheme } from "@/theme/context"
import { moderateScale } from "@/theme/spacing"
import { $styles } from "@/theme/styles"
import { ThemedStyle, ThemedStyleArray } from "@/theme/types"
import { typography } from "@/theme/typography"

import { Text, TextProps } from "./Text"

export interface TextFieldAccessoryProps {
  style: StyleProp<ViewStyle | TextStyle | ImageStyle>
  status: TextFieldProps["status"]
  multiline: boolean
  editable: boolean
}

export interface TextFieldProps extends Omit<TextInputProps, "ref"> {
  /**
   * A style modifier for different input states.
   */
  status?: "error" | "disabled"
  /**
   * The label text to display if not using `labelTx`.
   */
  label?: TextProps["text"]
  /**
   * Label text which is looked up via i18n.
   */
  labelTx?: TextProps["tx"]
  /**
   * Optional label options to pass to i18n. Useful for interpolation
   * as well as explicitly setting locale or translation fallbacks.
   */
  labelTxOptions?: TextProps["txOptions"]
  /**
   * Pass any additional props directly to the label Text component.
   */
  LabelTextProps?: TextProps
  /**
   * The helper text to display if not using `helperTx`.
   */
  helper?: TextProps["text"]
  /**
   * Helper text which is looked up via i18n.
   */
  helperTx?: TextProps["tx"]
  /**
   * Optional helper options to pass to i18n. Useful for interpolation
   * as well as explicitly setting locale or translation fallbacks.
   */
  helperTxOptions?: TextProps["txOptions"]
  /**
   * Pass any additional props directly to the helper Text component.
   */
  HelperTextProps?: TextProps
  /**
   * The placeholder text to display if not using `placeholderTx`.
   */
  placeholder?: TextProps["text"]
  /**
   * Placeholder text which is looked up via i18n.
   */
  placeholderTx?: TextProps["tx"]
  /**
   * Optional placeholder options to pass to i18n. Useful for interpolation
   * as well as explicitly setting locale or translation fallbacks.
   */
  placeholderTxOptions?: TextProps["txOptions"]
  /**
   * Optional input style override.
   */
  style?: StyleProp<TextStyle>
  /**
   * Style overrides for the container
   */
  containerStyle?: StyleProp<ViewStyle>
  /**
   * Style overrides for the input wrapper
   */
  inputWrapperStyle?: StyleProp<ViewStyle>
  /**
   * An optional component to render on the right side of the input.
   * Example: `RightAccessory={(props) => <Icon icon="ladybug" containerStyle={props.style} color={props.editable ? colors.textDim : colors.text} />}`
   * Note: It is a good idea to memoize this.
   */
  RightAccessory?: React.ReactNode
  /**
   * An optional component to render on the left side of the input.
   * Example: `LeftAccessory={(props) => <Icon icon="ladybug" containerStyle={props.style} color={props.editable ? colors.textDim : colors.text} />}`
   * Note: It is a good idea to memoize this.
   */
  LeftAccessory?: React.ReactNode
}

/**
 * A component that allows for the entering and editing of text.
 * @see [Documentation and Examples]{@link https://docs.infinite.red/ignite-cli/boilerplate/app/components/TextField/}
 * @param {TextFieldProps} props - The props for the `TextField` component.
 * @returns {JSX.Element} The rendered `TextField` component.
 */
export const TextField = forwardRef(function TextField(props: TextFieldProps, ref: Ref<TextInput>) {
  const {
    labelTx,
    label,
    labelTxOptions,
    placeholderTx,
    placeholder,
    placeholderTxOptions,
    helper,
    helperTx,
    helperTxOptions,
    status,
    RightAccessory,
    LeftAccessory,
    HelperTextProps,
    LabelTextProps,
    style: $inputStyleOverride,
    containerStyle: $containerStyleOverride,
    inputWrapperStyle: $inputWrapperStyleOverride,
    ...TextInputProps
  } = props
  const input = useRef<TextInput>(null)

  const {
    themed,
    theme: { colors },
  } = useAppTheme()

  const disabled = TextInputProps.editable === false || status === "disabled"

  const placeholderContent = placeholderTx
    ? translate(placeholderTx, placeholderTxOptions)
    : placeholder

  const $containerStyles = [$containerStyleOverride]

  const $labelStyles = [$labelStyle, LabelTextProps?.style]

  const $inputWrapperStyles = [
    $styles.row,
    $inputWrapperStyle,
    status === "error" && { borderColor: colors.error },
    TextInputProps.multiline && { minHeight: moderateScale(112) },
    !!LeftAccessory && { paddingStart: 0 },
    !!RightAccessory && { paddingEnd: 0 },
    $inputWrapperStyleOverride,
  ]

  const $inputStyles: ThemedStyleArray<TextStyle> = [
    $inputStyle as ThemedStyle<TextStyle>,
    disabled && { color: colors.textDim },
    isRTL && { textAlign: "right" as TextStyle["textAlign"] },
    TextInputProps.multiline && { height: "auto" },
    $inputStyleOverride,
  ]

  const $helperStyles = [
    $helperStyle,
    status === "error" && { color: colors.error },
    HelperTextProps?.style,
  ]

  /**
   *
   */
  function focusInput() {
    if (disabled) return

    input.current?.focus()
  }

  useImperativeHandle(ref, () => input.current as TextInput)

  return (
    <TouchableOpacity
      activeOpacity={1}
      style={$containerStyles}
      onPress={focusInput}
      accessibilityState={{ disabled }}
    >
      {!!(label || labelTx) && (
        <Text
          preset="formLabel"
          text={label}
          tx={labelTx}
          txOptions={labelTxOptions}
          {...LabelTextProps}
          style={themed($labelStyles)}
        />
      )}

      <View style={themed($inputWrapperStyles)}>
        <View style={themed($leftAccessoryStyle)}>{!!LeftAccessory && LeftAccessory}</View>

        <TextInput
          ref={input}
          underlineColorAndroid={colors.transparent}
          textAlignVertical="top"
          placeholder={placeholderContent}
          {...TextInputProps}
          editable={!disabled}
          style={themed($inputStyles)}
        />

        <View style={themed($rightAccessoryStyle)}>{!!RightAccessory && RightAccessory}</View>
      </View>

      {!!(helper || helperTx) && (
        <Text
          preset="formHelper"
          text={helper}
          tx={helperTx}
          txOptions={helperTxOptions}
          {...HelperTextProps}
          style={themed($helperStyles)}
        />
      )}
    </TouchableOpacity>
  )
})

const $labelStyle: ThemedStyle<TextStyle> = ({ spacing }) => ({
  marginBottom: spacing.xs,
  fontFamily: typography.fonts.zenKakuGothicNew.medium,
  color: colors.palette.primary700,
  fontSize: moderateScale(16),
})

const $inputWrapperStyle: ThemedStyle<ViewStyle> = ({ colors }) => ({
  alignItems: "flex-start",
  backgroundColor: colors.palette.neutral100,
  borderColor: colors.palette.neutral400,
  overflow: "hidden",
  borderRadius: 999,
  borderBlockColor: "blue",
})

const $inputStyle: ThemedStyle<ViewStyle> = ({ colors, typography }) => ({
  flex: 1,
  alignSelf: "stretch",
  fontFamily: typography.fonts.zenKakuGothicNew.medium,
  color: colors.palette.black[800],
  fontSize: moderateScale(16),
  paddingHorizontal: moderateScale(24),
})

const $helperStyle: ThemedStyle<TextStyle> = ({ spacing }) => ({
  marginTop: spacing.xs,
})

const $rightAccessoryStyle: ThemedStyle<ViewStyle> = ({ spacing }) => ({
  height: moderateScale(48),
  justifyContent: "center",
  alignItems: "center",
  paddingRight: moderateScale(spacing.lg),
})

const $leftAccessoryStyle: ThemedStyle<ViewStyle> = () => ({
  height: moderateScale(48),
  justifyContent: "center",
  alignItems: "center",
})
