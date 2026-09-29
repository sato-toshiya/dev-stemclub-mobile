import {
  Image,
  ImageStyle,
  StyleProp,
  TouchableOpacity,
  TouchableOpacityProps,
  View,
  ViewProps,
  ViewStyle,
} from "react-native"

export type IconTypes = keyof typeof iconRegistry

type BaseIconProps = {
  /**
   * The name of the icon
   */
  icon: IconTypes

  /**
   * An optional tint color for the icon
   */
  color?: string

  /**
   * An optional size for the icon. If not provided, the icon will be sized to the icon's resolution.
   */
  size?: number

  /**
   * Style overrides for the icon image
   */
  style?: StyleProp<ImageStyle>

  /**
   * Style overrides for the icon container
   */
  containerStyle?: StyleProp<ViewStyle>
}

type PressableIconProps = Omit<TouchableOpacityProps, "style"> & BaseIconProps
type IconProps = Omit<ViewProps, "style"> & BaseIconProps

/**
 * A component to render a registered icon.
 * It is wrapped in a <TouchableOpacity />
 * @see [Documentation and Examples]{@link https://docs.infinite.red/ignite-cli/boilerplate/app/components/Icon/}
 * @param {PressableIconProps} props - The props for the `PressableIcon` component.
 * @returns {JSX.Element} The rendered `PressableIcon` component.
 */
export function PressableIcon(props: PressableIconProps) {
  const {
    icon,
    color,
    size,
    style: $imageStyleOverride,
    containerStyle: $containerStyleOverride,
    ...pressableProps
  } = props

  const $imageStyle: StyleProp<ImageStyle> = [
    $imageStyleBase,
    color !== undefined && { tintColor: color },
    size !== undefined && { width: size, height: size },
    $imageStyleOverride,
  ]

  return (
    <TouchableOpacity {...pressableProps} style={$containerStyleOverride}>
      <Image style={$imageStyle} source={iconRegistry[icon]} />
    </TouchableOpacity>
  )
}

/**
 * A component to render a registered icon.
 * It is wrapped in a <View />, use `PressableIcon` if you want to react to input
 * @see [Documentation and Examples]{@link https://docs.infinite.red/ignite-cli/boilerplate/app/components/Icon/}
 * @param {IconProps} props - The props for the `Icon` component.
 * @returns {JSX.Element} The rendered `Icon` component.
 */
export function Icon(props: IconProps) {
  const {
    icon,
    color,
    size,
    style: $imageStyleOverride,
    containerStyle: $containerStyleOverride,
    ...viewProps
  } = props

  const $imageStyle: StyleProp<ImageStyle> = [
    $imageStyleBase,
    color !== undefined && { tintColor: color },
    size !== undefined && { width: size, height: size },
    $imageStyleOverride,
  ]

  return (
    <View {...viewProps} style={$containerStyleOverride}>
      <Image style={$imageStyle} source={iconRegistry[icon]} />
    </View>
  )
}

export const iconRegistry = {
  journey: require("@assets/icons/journey.png"),
  paintPalette: require("@assets/icons/paint-palette.png"),
  logout: require("@assets/icons/logout.png"),
  image: require("@assets/icons/image.png"),
  sun: require("@assets/icons/sun.png"),
  ladybug: require("@assets/icons/ladybug.png"),
  home: require("@assets/icons/home.png"),
  logo: require("@assets/icons/logo.png"),
  loginLeft: require("@assets/icons/login-left.png"),
  loginRight: require("@assets/icons/login-right.png"),
  penLine: require("@assets/icons/pen-line.png"),
  projectAdd: require("@assets/icons/project-add.png"),
  chevronRight: require("@assets/icons/chevron-right.png"),
  circleCheck: require("@assets/icons/circle-check.png"),
  goldMedal: require("@assets/icons/gold-medal.png"),
  layoutGrid: require("@assets/icons/layout-grid.png"),
  stars: require("@assets/icons/stars.png"),
  people: require("@assets/icons/people.png"),
  x: require("@assets/icons/x.png"),
  empty: require("@assets/icons/empty.png"),
  backClass: require("@assets/icons/back-class.png"),
}

const $imageStyleBase: ImageStyle = {
  resizeMode: "contain",
}
