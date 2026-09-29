const palette = {
  transparent: "transparent",
  black: {
    DEFAULT: "#000000",
    800: "#000008CC",
    300: "#32324D",
  },
  blue: {
    DEFAULT: "#9FD6F4",
    100: "#E0F4F9",
    600: "#2D9CDB",
  },

  neutral100: "#FFFFFF",
  neutral200: "#F4F2F1",
  neutral300: "#D7CEC9",
  neutral400: "#B6ACA6",
  neutral500: "#978F8A",
  neutral600: "#564E4A",
  neutral700: "#3C3836",
  neutral800: "#191015",
  neutral900: "#000000",

  violet: {
    800: "#9747FF",
  },

  indigo600: "#4C53B4",

  primary100: "#F4E0D9",
  primary200: "#E8C1B4",
  primary300: "#DDA28E",
  primary400: "#D28468",
  primary500: "#C76542",
  primary600: "#A54F31",
  primary700: "#C15724",

  secondary100: "#DCDDE9",
  secondary200: "#BCC0D6",
  secondary300: "#6E7491",
  secondary400: "#626894",
  secondary500: "#41476E",

  accent50: "#FEFDF5",
  accent100: "#FFEED4",
  accent200: "#FFDF9F",
  accent300: "#FDD495",
  accent400: "#FBC878",
  accent500: "#FFBB50",

  angry100: "#F2D6CD",
  angry200: "#FCE4EC",
  angry300: "#FFEEEE",
  angry500: "#F46957",
  angry600: "#FF6270",

  green100: "#F0FFEE",

  green400: "#32C84A",
  green900: "#059377",
  green600: "#41AC78",

  overlay20: "rgba(25, 16, 21, 0.2)",
  overlay50: "rgba(25, 16, 21, 0.5)",
} as const

export const colors = {
  /**
   * The palette is available to use, but prefer using the name.
   * This is only included for rare, one-off cases. Try to use
   * semantic names as much as possible.
   */
  palette,
  /**
   * A helper for making something see-thru.
   */
  transparent: "rgba(0, 0, 0, 0)",
  /**
   * The default text color in many components.
   */
  text: palette.black[800],
  /**
   * Secondary text information.
   */
  textDim: palette.neutral600,
  /**
   * The default color of the screen background.
   */
  background: palette.neutral200,
  /**
   * The default border color.
   */
  border: palette.neutral400,
  /**
   * The main tinting color.
   */
  tint: palette.primary500,
  /**
   * The inactive tinting color.
   */
  tintInactive: palette.neutral300,
  /**
   * A subtle color used for lines.
   */
  separator: palette.neutral300,
  /**
   * Error messages.
   */
  error: palette.angry500,
  /**
   * Error Background.
   */
  errorBackground: palette.angry100,
} as const
