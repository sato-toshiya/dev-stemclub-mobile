import { useMemo } from "react"
import {
  ActivityIndicator,
  FlatList,
  RefreshControl,
  StyleProp,
  StyleSheet,
  View,
  ViewStyle,
} from "react-native"
import Skeleton from "react-native-reanimated-skeleton"

import type { TeacherStudentPresenceItem } from "@/client"
import { Icon } from "@/components/Icon"
import { NoData } from "@/components/NoData"
import { Text } from "@/components/Text"
import { translate } from "@/i18n/translate"
import { useClassStore } from "@/stores/class/class.store"
import { colors } from "@/theme/colors"
import { moderateScale } from "@/theme/spacing"
import { typography } from "@/theme/typography"
import { useGetTeachersClassStudentsPresence } from "@/utils/api"

const PAGE_SIZE = 20

const EmptyComponent = ({ isLoading }: { isLoading: boolean }) => (
  <View style={styles.list}>
    {Array(6)
      .fill(1)
      .flatMap((_, index) => (
        <Skeleton
          key={index}
          isLoading={isLoading}
          containerStyle={[
            styles.item,
            index === 0 ? styles.borderItemFirst : index === 6 ? styles.borderItemLast : undefined,
          ]}
          layout={[
            {
              width: "60%",
              height: moderateScale(20),
              borderRadius: moderateScale(10),
            },
            {
              width: "25%",
              height: moderateScale(24),
              borderRadius: moderateScale(12),
            },
          ]}
        />
      ))}
  </View>
)

const StudentItem = ({
  item,
  style,
}: {
  item: TeacherStudentPresenceItem
  style?: StyleProp<ViewStyle>
}) => {
  const isOnline = item.presence_status === "online"

  return (
    <View style={[styles.item, style]}>
      <Text style={styles.name} size="sm" numberOfLines={1}>
        {item.name_kana || item.name}
      </Text>
      <View
        style={[
          styles.statusContainer,
          { backgroundColor: isOnline ? colors.palette.green100 : colors.palette.angry300 },
        ]}
      >
        <View
          style={[
            styles.statusDot,
            { backgroundColor: isOnline ? colors.palette.green400 : colors.palette.angry600 },
          ]}
        />
        <Text
          style={styles.statusText}
          size="xs"
          tx={isOnline ? "students:online" : "students:offline"}
        />
      </View>
    </View>
  )
}

export const StudentsScreen = () => {
  const selectedClass = useClassStore((state) => state.selectedClass)

  const query = useMemo(
    () => ({
      class: selectedClass?.documentId || "",
      "pagination[pageSize]": PAGE_SIZE,
    }),
    [selectedClass?.documentId],
  )
  const { data, fetchNextPage, isLoading, hasNextPage, isFetchingNextPage, isRefetching, refetch } =
    useGetTeachersClassStudentsPresence({
      query,
    })

  const students = useMemo(
    () => data?.pages.flatMap((page) => page?.data?.data || []) ?? [],
    [data?.pages],
  )

  if (!selectedClass) {
    return (
      <View style={styles.emptyContainer}>
        <Text size="md" tx="classes:class_name_and_amount" />
      </View>
    )
  }

  return (
    <View style={styles.container}>
      <View style={styles.titleView}>
        <Icon icon="layoutGrid" size={moderateScale(24)} />
        <Text
          tx="menu:class_list"
          size="sm"
          style={{
            fontFamily: typography.fonts.zenKakuGothicNew.semiBold,
            color: colors.palette.black[800],
          }}
        />
      </View>
      <Text
        text={`${translate("students:enrolled_student")} ${data?.pages?.[0]?.data?.meta?.presence.online_count ?? 0}/${data?.pages?.[0]?.data?.meta?.pagination?.total ?? 0}`}
      />
      {!isLoading && !students.length ? (
        <NoData />
      ) : (
        <FlatList
          data={students}
          onEndReached={() => {
            if (isLoading || isRefetching || isFetchingNextPage || !hasNextPage) return

            fetchNextPage()
          }}
          keyboardShouldPersistTaps="handled"
          scrollEventThrottle={16}
          onEndReachedThreshold={0.5}
          keyExtractor={(item) => item.id.toString()}
          contentContainerStyle={styles.list}
          renderItem={({ item, index }) => (
            <StudentItem
              item={item}
              style={
                index === 0
                  ? styles.borderItemFirst
                  : index === students.length - 1
                    ? styles.borderItemLast
                    : undefined
              }
            />
          )}
          ItemSeparatorComponent={() => <View style={styles.separator} />}
          refreshControl={
            <RefreshControl
              refreshing={isRefetching}
              onRefresh={refetch}
              colors={[colors.palette.primary600]}
            />
          }
          ListFooterComponent={
            isFetchingNextPage ? <ActivityIndicator size="small" color={colors.text} /> : null
          }
          ListEmptyComponent={<EmptyComponent isLoading={isLoading} />}
        />
      )}
    </View>
  )
}

const styles = StyleSheet.create({
  borderItemFirst: {
    borderTopLeftRadius: moderateScale(10),
    borderTopRightRadius: moderateScale(10),
  },
  borderItemLast: {
    borderBottomLeftRadius: moderateScale(10),
    borderBottomRightRadius: moderateScale(10),
  },
  container: {
    flex: 1,
  },
  emptyContainer: {
    alignItems: "center",
    backgroundColor: colors.background,
    flex: 1,
    justifyContent: "center",
  },
  item: {
    alignItems: "center",
    backgroundColor: colors.palette.neutral100,
    flexDirection: "row",
    gap: moderateScale(20),
    justifyContent: "space-between",
    padding: moderateScale(20),
  },
  list: {
    gap: 0,
    paddingHorizontal: moderateScale(40),
    paddingVertical: moderateScale(16),
  },
  name: {
    color: colors.palette.black[800],
    flex: 1,
    fontFamily: typography.fonts.zenKakuGothicNew.semiBold,
  },
  separator: {
    backgroundColor: colors.palette.transparent,
    height: moderateScale(1),
    marginVertical: 0,
  },
  statusContainer: {
    alignItems: "center",
    borderRadius: moderateScale(16),
    flexDirection: "row",
    gap: moderateScale(16),
    paddingHorizontal: moderateScale(12),
    paddingVertical: moderateScale(6),
  },
  statusDot: {
    borderRadius: 999,
    height: moderateScale(8),
    width: moderateScale(8),
  },
  statusText: {
    color: colors.palette.black[300],
    fontFamily: typography.fonts.zenKakuGothicNew.semiBold,
  },
  titleView: {
    alignItems: "center",
    flexDirection: "row",
    gap: moderateScale(8),
  },
})
