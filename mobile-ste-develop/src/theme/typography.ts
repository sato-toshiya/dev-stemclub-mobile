// TODO: write documentation about fonts and typography along with guides on how to add custom fonts in own
// markdown file and add links from here

import { Platform } from "react-native"
import { Baloo2_600SemiBold, Baloo2_700Bold } from "@expo-google-fonts/baloo-2"
import { Inter_600SemiBold } from "@expo-google-fonts/inter"
import { KleeOne_400Regular, KleeOne_600SemiBold } from "@expo-google-fonts/klee-one"
import { Poppins_700Bold } from "@expo-google-fonts/poppins"
import { Roboto_500Medium } from "@expo-google-fonts/roboto"
import {
  ZenKakuGothicNew_400Regular,
  ZenKakuGothicNew_500Medium,
  ZenKakuGothicNew_700Bold,
} from "@expo-google-fonts/zen-kaku-gothic-new"

export const customFontsToLoad = {
  KleeOne_400Regular,
  KleeOne_600SemiBold,
  Poppins_700Bold,
  Baloo2_600SemiBold,
  Roboto_500Medium,
  Inter_600SemiBold,
  Baloo2_700Bold,
  ZenKakuGothicNew_400Regular,
  ZenKakuGothicNew_500Medium,
  ZenKakuGothicNew_700Bold,
}

const fonts = {
  poppins: {
    bold: "Poppins_700Bold",
  },
  roboto: {
    medium: "Roboto_500Medium",
  },
  baloo2: {
    semiBold: "Baloo2_600SemiBold",
    bold: "Baloo2_700Bold",
  },
  kleeOne: {
    // Cross-platform Google font.
    normal: "KleeOne_400Regular",
    semiBold: "KleeOne_600SemiBold",
  },
  helveticaNeue: {
    // iOS only font.
    thin: "HelveticaNeue-Thin",
    light: "HelveticaNeue-Light",
    normal: "Helvetica Neue",
    medium: "HelveticaNeue-Medium",
  },
  courier: {
    // iOS only font.
    normal: "Courier",
  },
  sansSerif: {
    // Android only font.
    thin: "sans-serif-thin",
    light: "sans-serif-light",
    normal: "sans-serif",
    medium: "sans-serif-medium",
  },
  monospace: {
    // Android only font.
    normal: "monospace",
  },
  inter: {
    semiBold: "Inter_600SemiBold",
  },
  zenKakuGothicNew: {
    normal: "ZenKakuGothicNew_400Regular",
    semiBold: "ZenKakuGothicNew_500Medium",
    medium: "ZenKakuGothicNew_500Medium",
    bold: "ZenKakuGothicNew_700Bold",
  },
}

export const typography = {
  /**
   * The fonts are available to use, but prefer using the semantic name.
   */
  fonts,
  /**
   * The primary font. Used in most places.
   */
  primary: fonts.zenKakuGothicNew,
  /**
   * An alternate font used for perhaps titles and stuff.
   */
  secondary: Platform.select({ ios: fonts.helveticaNeue, android: fonts.sansSerif }),
  /**
   * Lets get fancy with a monospace font!
   */
  code: Platform.select({ ios: fonts.courier, android: fonts.monospace }),
}
