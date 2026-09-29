import NetInfo from "@react-native-community/netinfo"

export async function hasInternetConnection(): Promise<boolean> {
  const state = await NetInfo.fetch()
  // On some Android devices, isInternetReachable can stay false for a while even if connected.
  // We prioritize isConnected to ensure sync can start as soon as a network is available.
  return !!state.isConnected
}
