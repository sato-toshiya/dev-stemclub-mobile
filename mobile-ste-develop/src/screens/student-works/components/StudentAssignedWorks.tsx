import { useMemo } from "react"
import { ActivityIndicator, FlatList, RefreshControl, StyleSheet, View } from "react-native"
import { router } from "expo-router"
import { InfiniteData, UseInfiniteQueryResult } from "@tanstack/react-query"
import type { AxiosError, AxiosResponse } from "axios"
import { formatDate } from "date-fns/format"
import Skeleton from "react-native-reanimated-skeleton"

import { ClassAssignmentItemStudent, StudentClassAssignmentsResponse, UploadFileCa } from "@/client"
import { AutoImage } from "@/components/AutoImage"
import { Button } from "@/components/Button"
import { NoData } from "@/components/NoData"
import { Text } from "@/components/Text"
import { ProjectCard } from "@/components/works/ProjectCard"
import { translate } from "@/i18n/translate"
import { useAuthUser } from "@/stores/auth/auth.selectors"
import { colors } from "@/theme/colors"
import { moderateScale } from "@/theme/spacing"
import { typography } from "@/theme/typography"
import { resolveOfflineAssetUri } from "@/utils/offlineSync"

const EmptyComponent = ({ loading }: { loading: boolean }) => (
  <View style={styles.emptyContainer}>
    {Array(3)
      .fill(1)
      .map((_, index) => (
        <View key={index} style={styles.emptyItem}>
          <Skeleton
            isLoading={loading}
            containerStyle={styles.emptySkeleton}
            layout={[
              {
                width: "100%",
                height: moderateScale(129),
                borderRadius: moderateScale(12),
                marginBottom: moderateScale(8),
              },
              {
                width: "85%",
                height: moderateScale(16),
                borderRadius: moderateScale(8),
                marginBottom: moderateScale(6),
              },
              {
                width: "65%",
                height: moderateScale(12),
                borderRadius: moderateScale(6),
              },
              {
                width: "65%",
                height: moderateScale(33),
                borderRadius: moderateScale(6),
              },
            ]}
          />
        </View>
      ))}
  </View>
)

const StudentAssignedWorksItem = ({ item }: { item: ClassAssignmentItemStudent }) => {
  const {
    assigned_thumbnail: thumbnail,
    assigned_title: title,
    assigned_sjr_file,
    assigned_at,
  } = item ?? {}

  const user = useAuthUser()
  const handleOpenProject = (sjr_file: UploadFileCa) => {
    const resolvedFilePath = resolveOfflineAssetUri(sjr_file?.url)
    if (!resolvedFilePath) {
      return
    }
    router.push({
      pathname: "/scratchjr",
      params: {
        filepath: resolvedFilePath,
        mode: "new",
        filename: [formatDate(new Date(), "yyyyMMdd"), user?.name, title].filter(Boolean).join("_"),
      },
    })
  }
  return (
    <ProjectCard style={styles.item}>
      <AutoImage
        source={{ uri: resolveOfflineAssetUri(thumbnail?.url) }}
        style={styles.projectThumbnail}
      />
      <Text
        size="sm"
        numberOfLines={1}
        style={{
          fontFamily: typography.fonts.zenKakuGothicNew.semiBold,
          color: colors.palette.secondary300,
        }}
      >
        {title}
      </Text>
      <Text
        size="xxs"
        style={{
          fontFamily: typography.fonts.zenKakuGothicNew.semiBold,
          color: colors.palette.secondary300,
        }}
      >
        {translate("works:updated_at")}: {assigned_at ? formatDate(assigned_at, "yyyyMMdd") : ""}
      </Text>
      <Button
        tx="works:copy_and_create"
        onPress={() => handleOpenProject(assigned_sjr_file)}
        preset="filled"
        style={{
          backgroundColor: colors.palette.blue[600],
          marginTop: moderateScale(12),
        }}
        textStyle={{ color: colors.palette.neutral100 }}
      />
    </ProjectCard>
  )
}

type Props = UseInfiniteQueryResult<
  InfiniteData<
    | (AxiosResponse<StudentClassAssignmentsResponse, any, {}> & {
        error: undefined
      })
    | (AxiosError<unknown, any> & {
        data: undefined
        error: unknown
      })
    | AxiosResponse<StudentClassAssignmentsResponse, any, {}>,
    unknown
  >,
  Error
>
export const StudentAssignedWorks = ({
  data,
  fetchNextPage,
  isLoading,
  refetch,
  hasNextPage,
  isFetchingNextPage,
}: Props) => {
  const assignedProjects = useMemo(
    () => data?.pages.flatMap((page) => page?.data?.data || []) ?? [],
    [data?.pages],
  )

  if (!isLoading && !assignedProjects.length) {
    return <NoData />
  }

  return (
    <FlatList
      data={assignedProjects}
      horizontal
      contentContainerStyle={styles.flatList}
      removeClippedSubviews
      directionalLockEnabled
      bounces={false}
      overScrollMode="never"
      keyExtractor={(item) => item.id.toString()}
      renderItem={({ item }) => <StudentAssignedWorksItem item={item} />}
      onEndReached={() => {
        if (isLoading || isFetchingNextPage) return

        if (hasNextPage) {
          fetchNextPage()
        }
      }}
      initialNumToRender={5}
      windowSize={5}
      onEndReachedThreshold={0.5}
      keyboardShouldPersistTaps="handled"
      scrollEventThrottle={16}
      refreshControl={
        <RefreshControl
          refreshing={isLoading}
          onRefresh={refetch}
          colors={[colors.palette.primary600]}
        />
      }
      ItemSeparatorComponent={() => <View style={{ width: moderateScale(40) }} />}
      ListEmptyComponent={<EmptyComponent loading={isLoading} />}
      ListFooterComponent={
        isFetchingNextPage ? <ActivityIndicator size="small" color={colors.text} /> : null
      }
    />
  )
}

const styles = StyleSheet.create({
  emptyContainer: {
    flexDirection: "row",
    gap: moderateScale(40),
  },
  emptyItem: {
    aspectRatio: 1,
    borderRadius: moderateScale(16),
    height: moderateScale(268),
    width: moderateScale(268),
  },
  emptySkeleton: {
    flex: 1,
    justifyContent: "center",
  },
  flatList: {
    backgroundColor: colors.palette.blue[100],
    borderColor: colors.palette.blue.DEFAULT,
    borderRadius: moderateScale(8),
    borderStyle: "dashed",
    borderWidth: moderateScale(3),
    marginTop: moderateScale(32),
    paddingHorizontal: moderateScale(40),
    paddingVertical: moderateScale(24),
  },
  item: {
    aspectRatio: 1,
    borderRadius: moderateScale(16),
    height: moderateScale(268),
    justifyContent: "center",
  },

  projectThumbnail: {
    flex: 1,
    height: moderateScale(129),
    objectFit: "contain",
    width: "100%",
  },
})
