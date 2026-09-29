declare module "expo-screen-orientation" {
  export enum OrientationLock {
    DEFAULT = "DEFAULT",
    ALL = "ALL",
    PORTRAIT = "PORTRAIT",
    PORTRAIT_UP = "PORTRAIT_UP",
    PORTRAIT_DOWN = "PORTRAIT_DOWN",
    LANDSCAPE = "LANDSCAPE",
    LANDSCAPE_LEFT = "LANDSCAPE_LEFT",
    LANDSCAPE_RIGHT = "LANDSCAPE_RIGHT",
  }

  export function lockAsync(orientationLock: OrientationLock): Promise<void>
  export function unlockAsync(): Promise<void>
}
