import { useRef, useState } from "react"
import {
  ActivityIndicator,
  FlatList,
  Modal,
  Pressable,
  StyleProp,
  TextStyle,
  TouchableOpacity,
  View,
  ViewStyle,
} from "react-native"
import { SafeAreaView } from "react-native-safe-area-context"

import { isRTL } from "@/i18n"
import { translate } from "@/i18n/translate"
import { colors } from "@/theme/colors"
import { useAppTheme } from "@/theme/context"
import { moderateScale } from "@/theme/spacing"
import { $styles } from "@/theme/styles"
import { ThemedStyle, ThemedStyleArray } from "@/theme/types"
import { typography } from "@/theme/typography"

import { Icon } from "./Icon"
import { Text, TextProps } from "./Text"

export interface SelectOption {
  label: string
  value: string | number
  disabled?: boolean
}

export interface SelectProps {
  /**
   * Array of options to display in the select dropdown
   */
  options: SelectOption[]
  /**
   * The selected value
   */
  value?: string | number
  /**
   * Callback fired when an option is selected
   */
  onSelect?: (value: string | number, option: SelectOption) => void
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
  style?: StyleProp<ViewStyle>
  /**
   * Style overrides for the container
   */
  containerStyle?: StyleProp<ViewStyle>
  /**
   * Style overrides for the select wrapper
   */
  selectWrapperStyle?: StyleProp<ViewStyle>
  /**
   * Style overrides for the dropdown modal
   */
  dropdownStyle?: StyleProp<ViewStyle>
  /**
   * Style overrides for individual option items
   */
  optionStyle?: StyleProp<ViewStyle>
  /**
   * Callback fired when user scrolls to the end of the list (for infinite scroll)
   */
  onLoadMore?: () => void
  /**
   * Whether there are more items to load (for infinite scroll)
   */
  hasMore?: boolean
  /**
   * Whether more items are currently being loaded (for infinite scroll)
   */
  isLoadingMore?: boolean
  /**
   * Whether the initial data is currently being loaded
   */
  isLoading?: boolean
  /**
   * Function to refetch/reload the data
   */
  refetch?: () => void
  truncateSelectedText?: boolean
  truncateOptionText?: boolean
}

/**
 * A component that allows users to select an option from a dropdown list.
 * @param {SelectProps} props - The props for the `Select` component.
 * @returns {JSX.Element} The rendered `Select` component.
 * @example
 * <Select
 *   label="Choose an option"
 *   placeholder="Select..."
 *   options={[
 *     { label: "Option 1", value: "1" },
 *     { label: "Option 2", value: "2" },
 *   ]}
 *   value={selectedValue}
 *   onSelect={(value) => setSelectedValue(value)}
 * />
 */
export function Select(props: SelectProps) {
  const {
    options,
    value,
    onSelect,
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
    LabelTextProps,
    HelperTextProps,
    style: $selectStyleOverride,
    containerStyle: $containerStyleOverride,
    selectWrapperStyle: $selectWrapperStyleOverride,
    dropdownStyle: $dropdownStyleOverride,
    optionStyle: $optionStyleOverride,
    onLoadMore,
    hasMore,
    isLoadingMore,
    isLoading,
    refetch: _refetch,
    truncateSelectedText = false,
    truncateOptionText = false,
  } = props

  const [isOpen, setIsOpen] = useState(false)
  const selectRef = useRef<View>(null)

  const {
    themed,
    theme: { colors: themeColors },
  } = useAppTheme()

  const disabled = status === "disabled" || isLoading

  const selectedOption = options.find((option) => option.value === value)
  const displayText =
    selectedOption?.label ||
    (placeholderTx ? translate(placeholderTx, placeholderTxOptions) : placeholder) ||
    ""

  const $containerStyles = [$containerStyleOverride]

  const $labelStyles = [$labelStyle, LabelTextProps?.style]

  const $selectWrapperStyles: ThemedStyleArray<ViewStyle> = [
    $styles.row,
    $selectWrapperStyle,
    status === "error" && { borderColor: themeColors.error },
    $selectWrapperStyleOverride,
  ]

  const $selectStyles: ThemedStyleArray<ViewStyle> = [
    $selectStyle as ThemedStyle<ViewStyle>,
    disabled && { opacity: 0.5 },
    $selectStyleOverride,
  ]

  const $helperStyles = [
    $helperStyle,
    status === "error" && { color: themeColors.error },
    HelperTextProps?.style,
  ]

  function handleOpen() {
    if (disabled) return
    setIsOpen(true)
  }

  function handleClose() {
    setIsOpen(false)
  }

  function handleSelect(option: SelectOption) {
    if (option.disabled) return
    onSelect?.(option.value, option)
    handleClose()
  }

  return (
    <>
      <TouchableOpacity
        ref={selectRef}
        activeOpacity={1}
        style={$containerStyles}
        onPress={handleOpen}
        accessibilityState={{ disabled }}
        accessibilityRole="button"
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

        <View style={themed($selectWrapperStyles)}>
          <View style={themed($selectStyles)}>
            {isLoading ? (
              <ActivityIndicator size="small" color={themeColors.palette.primary600} />
            ) : (
              <Text
                numberOfLines={truncateSelectedText ? 1 : undefined}
                ellipsizeMode={truncateSelectedText ? "tail" : undefined}
                style={themed([
                  $selectTextStyle,
                  truncateSelectedText && $truncateTextStyle,
                  !selectedOption && { color: themeColors.textDim },
                  isRTL && { textAlign: "right" as TextStyle["textAlign"] },
                ])}
              >
                {displayText}
              </Text>
            )}
          </View>

          <View style={themed($rightAccessoryStyle)}>
            {isLoading ? null : (
              <Icon
                icon="chevronRight"
                size={moderateScale(20)}
                color={disabled ? themeColors.textDim : themeColors.text}
                style={[$chevronStyleBase, isOpen && { transform: [{ rotate: "-90deg" }] }]}
              />
            )}
          </View>
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

      <Modal
        visible={isOpen}
        transparent
        animationType="fade"
        onRequestClose={handleClose}
        supportedOrientations={["landscape-left", "landscape-right"]}
      >
        <SafeAreaView style={themed($modalContainerStyle)}>
          <Pressable style={themed($modalOverlayStyle)} onPress={handleClose}>
            <View style={themed([$dropdownStyle, $dropdownStyleOverride])}>
              <FlatList
                data={options}
                keyExtractor={(item, index) => `${item.value}-${index}`}
                renderItem={({ item: option, index }) => {
                  const isSelected = option.value === value
                  const isDisabled = option.disabled || false

                  return (
                    <Pressable
                      onPress={() => handleSelect(option)}
                      disabled={isDisabled}
                      style={themed([
                        $optionStyle,
                        isSelected && $selectedOptionStyle,
                        isDisabled && $disabledOptionStyle,
                        index === 0 && $firstOptionStyle,
                        index === options.length - 1 && !hasMore && $lastOptionStyle,
                        $optionStyleOverride,
                      ])}
                    >
                      <Text
                        numberOfLines={truncateOptionText ? 1 : undefined}
                        ellipsizeMode={truncateOptionText ? "tail" : undefined}
                        style={themed([
                          $optionTextStyle,
                          truncateOptionText && $truncateTextStyle,
                          isSelected && $selectedOptionTextStyle,
                          isDisabled && $disabledOptionTextStyle,
                        ])}
                      >
                        {option.label}
                      </Text>
                    </Pressable>
                  )
                }}
                style={themed($dropdownScrollStyle)}
                showsVerticalScrollIndicator={false}
                onEndReached={() => {
                  if (hasMore && !isLoadingMore && onLoadMore) {
                    onLoadMore()
                  }
                }}
                onEndReachedThreshold={0.3}
                ListFooterComponent={
                  isLoadingMore ? (
                    <View style={themed($footerLoaderStyle)}>
                      <ActivityIndicator size="small" color={colors.palette.primary600} />
                    </View>
                  ) : null
                }
              />
            </View>
          </Pressable>
        </SafeAreaView>
      </Modal>
    </>
  )
}

const $modalContainerStyle: ThemedStyle<ViewStyle> = () => ({
  flex: 1,
  backgroundColor: "transparent",
})
const $labelStyle: ThemedStyle<TextStyle> = ({ spacing }) => ({
  marginBottom: spacing.xs,
  fontFamily: typography.fonts.zenKakuGothicNew.medium,
  color: colors.palette.primary700,
  fontSize: moderateScale(16),
})

const $selectWrapperStyle: ThemedStyle<ViewStyle> = ({ colors }) => ({
  alignItems: "center",
  backgroundColor: colors.palette.neutral100,
  borderColor: colors.palette.neutral400,
  borderWidth: 1,
  borderRadius: 999,
  overflow: "hidden",
  minHeight: moderateScale(48),
})

const $selectStyle: ThemedStyle<ViewStyle> = ({ typography }) => ({
  flex: 1,
  alignSelf: "stretch",
  justifyContent: "center",
  fontFamily: typography.fonts.zenKakuGothicNew.medium,
  paddingHorizontal: moderateScale(24),
  minHeight: moderateScale(48),
})

const $selectTextStyle: ThemedStyle<TextStyle> = ({ colors, typography }) => ({
  fontFamily: typography.fonts.zenKakuGothicNew.medium,
  color: colors.palette.black[800],
  fontSize: moderateScale(16),
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

const $chevronStyleBase = {
  transform: [{ rotate: "90deg" }],
} as const

const $modalOverlayStyle: ThemedStyle<ViewStyle> = () => ({
  flex: 1,
  backgroundColor: colors.palette.overlay50,
  justifyContent: "center",
  alignItems: "center",
  paddingHorizontal: moderateScale(24),
})

const $dropdownStyle: ThemedStyle<ViewStyle> = ({ colors: themeColors }) => ({
  backgroundColor: themeColors.palette.neutral100,
  borderRadius: moderateScale(12),
  maxHeight: moderateScale(400),
  minWidth: moderateScale(200),
  width: "100%",
  shadowColor: themeColors.palette.black.DEFAULT,
  shadowOffset: { width: 0, height: 2 },
  shadowOpacity: 0.25,
  shadowRadius: 8,
  elevation: 5,
})

const $dropdownScrollStyle: ThemedStyle<ViewStyle> = () => ({
  maxHeight: moderateScale(400),
})

const $optionStyle: ThemedStyle<ViewStyle> = ({ colors: themeColors, spacing }) => ({
  paddingVertical: moderateScale(spacing.md),
  paddingHorizontal: moderateScale(spacing.lg),
  borderBottomWidth: 1,
  borderBottomColor: themeColors.palette.neutral200,
})

const $firstOptionStyle: ThemedStyle<ViewStyle> = () => ({
  borderTopLeftRadius: moderateScale(12),
  borderTopRightRadius: moderateScale(12),
})

const $lastOptionStyle: ThemedStyle<ViewStyle> = () => ({
  borderBottomLeftRadius: moderateScale(12),
  borderBottomRightRadius: moderateScale(12),
  borderBottomWidth: 0,
})

const $selectedOptionStyle: ThemedStyle<ViewStyle> = ({ colors }) => ({
  backgroundColor: colors.palette.primary100,
})

const $disabledOptionStyle: ThemedStyle<ViewStyle> = () => ({
  opacity: 0.5,
})

const $optionTextStyle: ThemedStyle<TextStyle> = ({ colors, typography }) => ({
  fontFamily: typography.fonts.zenKakuGothicNew.medium,
  color: colors.palette.black[800],
  fontSize: moderateScale(16),
})

const $selectedOptionTextStyle: ThemedStyle<TextStyle> = ({ colors }) => ({
  color: colors.palette.primary700,
})

const $disabledOptionTextStyle: ThemedStyle<TextStyle> = ({ colors }) => ({
  color: colors.textDim,
})

const $footerLoaderStyle: ThemedStyle<ViewStyle> = ({ spacing }) => ({
  paddingVertical: moderateScale(spacing.md),
  alignItems: "center",
  justifyContent: "center",
})

const $truncateTextStyle: ThemedStyle<TextStyle> = () => ({
  flexShrink: 1,
})
