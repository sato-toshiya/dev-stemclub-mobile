import { useCallback, useMemo } from "react"
import {
  ActivityIndicator,
  FlatList,
  RefreshControl,
  StyleSheet,
  TouchableOpacity,
  View,
} from "react-native"
import { router, useFocusEffect } from "expo-router"
import { Toast } from "toastify-react-native"
import Skeleton from "react-native-reanimated-skeleton"

import { Button } from "@/components/Button"
import { Icon } from "@/components/Icon"
import { NoData } from "@/components/NoData"
import { Text } from "@/components/Text"
import { useAuthStore } from "@/stores/auth/auth.store"
import { useClassStore } from "@/stores/class/class.store"
import { colors } from "@/theme/colors"
import { moderateScale } from "@/theme/spacing"
import { translate } from "@/i18n/translate"
import { typography } from "@/theme/typography"
import { useGetMyClasses } from "@/utils/api"
import { useIsOnline } from "@/utils/useIsOnline"
import { startBackgroundOfflineSync } from "@/utils/offlineSync"

const PAGE_SIZE = 20
const EmptyComponent = ({ isLoading }: { isLoading: boolean }) => (
  <View style={styles.list}>
    {Array(20)
      .fill(1)
      .flatMap((_, index) => (
        <Skeleton
          key={index}
          isLoading={isLoading}
          containerStyle={styles.item}
          layout={[
            {
              width: "70%",
              height: moderateScale(20),
              borderRadius: moderateScale(10),
            },
            {
              width: moderateScale(19),
              height: moderateScale(10),
              borderRadius: moderateScale(2),
            },
          ]}
        />
      ))}
  </View>
)
export function ClassesScreen() {
  const setClass = useClassStore((state) => state.setClass)
  const clearClass = useClassStore((state) => state.clearClass)
  const logout = useAuthStore((state) => state.logout)
  const isOnline = useIsOnline()

  const query = useMemo(
    () => ({
      "pagination[pageSize]": PAGE_SIZE,
    }),
    [],
  )
  const { data, fetchNextPage, isLoading, hasNextPage, isFetchingNextPage, refetch } =
    useGetMyClasses({
      query,
    })

  const classes = useMemo(() => {
    return data?.pages.flatMap((page) => page?.data?.data || []) ?? []
  }, [data?.pages])

  useFocusEffect(
    useCallback(() => {
      refetch()
    }, [refetch]),
  )

  const handleLogout = () => {
    if (!isOnline) {
      Toast.error(translate("login:offline_cannot_logout"))
      return
    }
    logout()
    clearClass()
    router.replace("/login")
  }

  return (
    <>
      <Text style={styles.title} size="xxl" tx="classes:school_title" />

      {!isLoading && !classes.length ? (
        <View style={styles.emptyContainer}>
          <NoData />

          <Button
            tx="login:logout"
            preset="danger"
            shape="rounded"
            style={[styles.logoutButton, !isOnline && styles.logoutButtonDisabled]}
            textStyle={styles.logoutButtonText}
            onPress={handleLogout}
            disabled={!isOnline}
          />
        </View>
      ) : (
        <FlatList
          data={classes}
          onEndReached={() => {
            if (isLoading || isFetchingNextPage) return
            if (hasNextPage) {
              fetchNextPage()
            }
          }}
          keyboardShouldPersistTaps="handled"
          scrollEventThrottle={16}
          onEndReachedThreshold={0.5}
          keyExtractor={(item) => item.id.toString()}
          contentContainerStyle={styles.list}
          renderItem={({ item }) => (
            <TouchableOpacity
              style={styles.item}
              onPress={() => {
                setClass(item)
                router.push("/class-works")
              }}
            >
              <Text
                style={styles.itemText}
                size="sm"
                tx="classes:class_name_and_amount"
                txOptions={{ name: item.name, amount: item.studentsCount }}
              />

              <Icon
                icon="chevronRight"
                style={{ width: moderateScale(19), height: moderateScale(10) }}
              />
            </TouchableOpacity>
          )}
          refreshControl={
            <RefreshControl
              refreshing={isLoading}
              onRefresh={async () => {
                await startBackgroundOfflineSync("teacher")
                refetch()
              }}
              colors={[colors.palette.primary600]}
            />
          }
          ListFooterComponent={
            isFetchingNextPage ? <ActivityIndicator size="small" color={colors.text} /> : null
          }
          ListEmptyComponent={<EmptyComponent isLoading />}
        />
      )}
    </>
  )
}

const styles = StyleSheet.create({
  emptyContainer: {
    alignItems: "center",
    gap: moderateScale(24),
  },
  item: {
    alignItems: "center",
    backgroundColor: colors.palette.angry200,
    borderRadius: 9999,
    flexDirection: "row",
    justifyContent: "space-between",
    paddingHorizontal: moderateScale(24),
    paddingVertical: moderateScale(6),
    width: "60%",
  },
  itemText: {
    color: colors.palette.black[300],
    fontFamily: typography.fonts.zenKakuGothicNew.normal,
  },
  list: {
    alignItems: "center",
    gap: moderateScale(14),
  },
  logoutButton: {
    minWidth: moderateScale(160),
    paddingHorizontal: moderateScale(24),
  },
  logoutButtonDisabled: {
    opacity: 0.5,
  },
  logoutButtonText: {
    fontFamily: typography.fonts.zenKakuGothicNew.normal,
    textTransform: "uppercase",
  },
  title: {
    color: colors.palette.black[300],
    fontFamily: typography.fonts.zenKakuGothicNew.normal,
    marginBottom: moderateScale(40),
    textAlign: "center",
  },
})
