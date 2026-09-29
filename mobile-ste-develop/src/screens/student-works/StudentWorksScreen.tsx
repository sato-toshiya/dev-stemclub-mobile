import { useCallback, useEffect, useMemo, useRef, useState } from "react"
import {
  ActivityIndicator,
  FlatList,
  Platform,
  RefreshControl,
  StyleSheet,
  View,
} from "react-native"
import { useFocusEffect } from "expo-router"
import NetInfo from "@react-native-community/netinfo"
import Skeleton from "react-native-reanimated-skeleton"
import { useQueryClient } from "@tanstack/react-query"
import { Toast } from "toastify-react-native"

import { ClassAssignmentItemStudent, ProjectItem } from "@/client"
import { getProjectsMyQueryKey } from "@/client/@tanstack/react-query.gen"
import { NoData } from "@/components/NoData"
import { Text } from "@/components/Text"
import { translate } from "@/i18n/translate"
import { useAuthToken } from "@/stores/auth/auth.selectors"
import { colors } from "@/theme/colors"
import { moderateScale } from "@/theme/spacing"
import { typography } from "@/theme/typography"
import { useGetMyProjects } from "@/utils/api"
import { useGetClassAssignmentsForStudent } from "@/utils/api/useGetClassAssignmentsForStudent"
import { startBackgroundOfflineSync } from "@/utils/offlineSync"
import { getPendingUploads, syncPendingUploads } from "@/utils/scratchjrPendingUploads"

import { StudentAssignedWorks, StudentMyWorks } from "./components"
import { StudentAssignedWorksTitle, StudentMyWorksTitle } from "./components/section-title"

const PAGE_SIZE = 9
const NUM_COLUMNS = 3

export type ProjectFakeItem = {
  id: number
  updatedAt: string
  title: string
  thumbnail: null
  sjr_file: null
  documentId: string
  fakeItem: boolean
}

interface ListItem {
  id: string
  type: "assigned-section" | "assigned-item" | "my-section" | "my-row"
  data?: ProjectItem[] | (ProjectItem | ProjectFakeItem)[] | ClassAssignmentItemStudent[]
  index?: number
}

const EmptyComponent = ({ loading }: { loading: boolean }) => (
  <View style={styles.emptyContainer}>
    {Array(10)
      .fill(1)
      .map((_, index) => (
        <Skeleton
          key={index}
          isLoading={loading}
          containerStyle={styles.skeletonItem}
          layout={[
            {
              width: "100%",
              height: moderateScale(150),
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
          ]}
        />
      ))}
  </View>
)

export const StudentWorksScreen = () => {
  const queryClient = useQueryClient()
  const token = useAuthToken()
  const [isSyncingPendingUploads, setIsSyncingPendingUploads] = useState(false)
  const isSyncingPendingUploadsRef = useRef(false)
  const lastOnlineRef = useRef<boolean | null>(null)
  const lastSyncAttemptAtRef = useRef(0)

  const myProjectsQuery = useGetMyProjects({
    query: {
      "pagination[pageSize]": PAGE_SIZE,
    },
  })
  const {
    data: myProjectsData,
    hasNextPage: hasNextMyProjectsPage,
    isLoading: isMyProjectsLoading,
    isFetchingNextPage: isMyProjectsFetchingNextPage,
    refetch: refetchMyProjects,
    fetchNextPage: fetchNextMyProjects,
  } = myProjectsQuery
  const myProjects = useMemo(() => {
    const projects = myProjectsData?.pages.flatMap((page) => page?.data?.data || []) ?? []

    return projects.length % NUM_COLUMNS !== 0
      ? [
          ...projects,
          ...Array(NUM_COLUMNS - (projects.length % NUM_COLUMNS))
            .fill(1)
            .map((_, index) => ({
              id: index,
              updatedAt: "2026-01-16T10:42:49.359Z",
              title: "fake",
              thumbnail: null,
              sjr_file: null,
              documentId: "",
              fakeItem: true,
            })),
        ]
      : projects
  }, [myProjectsData?.pages])

  const studentAssignWorksQuery = useGetClassAssignmentsForStudent({
    "pagination[pageSize]": PAGE_SIZE,
  })

  const {
    refetch: refetchAssigned,
    isLoading: isStudentAssignWorksLoading,
    isFetchingNextPage: isStudentAssignWorksFetchingNextPage,
  } = studentAssignWorksQuery

  useFocusEffect(
    useCallback(() => {
      refetchMyProjects()
      refetchAssigned()
    }, [refetchMyProjects, refetchAssigned]),
  )

  const syncPendingUploadsFromQueue = useCallback(async () => {
    if (Platform.OS === "web" || !token || isSyncingPendingUploadsRef.current) {
      return
    }

    const pending = getPendingUploads()
    if (!pending.length) {
      return
    }

    isSyncingPendingUploadsRef.current = true
    lastSyncAttemptAtRef.current = Date.now()
    setIsSyncingPendingUploads(true)
    try {
      const syncedCount = await syncPendingUploads(token)
      if (syncedCount > 0) {
        await startBackgroundOfflineSync("student")
        queryClient.invalidateQueries({ queryKey: getProjectsMyQueryKey() })
        refetchMyProjects()
      }
    } finally {
      isSyncingPendingUploadsRef.current = false
      setIsSyncingPendingUploads(false)
    }
  }, [queryClient, refetchMyProjects, token])

  useEffect(() => {
    syncPendingUploadsFromQueue()
  }, [syncPendingUploadsFromQueue])

  useEffect(() => {
    const isOnlineState = (state: {
      isConnected: boolean | null
      isInternetReachable: boolean | null
    }) => state.isConnected === true || state.isInternetReachable === true

    const handleOnlineCheck = (online: boolean) => {
      const wasOnline = lastOnlineRef.current
      lastOnlineRef.current = online
      const now = Date.now()
      const shouldRetryWhileOnline = now - lastSyncAttemptAtRef.current > 5000

      if (online && (wasOnline !== true || shouldRetryWhileOnline)) {
        syncPendingUploadsFromQueue()
      }
    }

    NetInfo.fetch().then((state) => {
      handleOnlineCheck(isOnlineState(state))
    })

    const unsubscribe = NetInfo.addEventListener((state) => {
      handleOnlineCheck(isOnlineState(state))
    })

    const pollId = setInterval(async () => {
      const state = await NetInfo.fetch()
      handleOnlineCheck(isOnlineState(state))
    }, 2500)

    return () => {
      clearInterval(pollId)
      unsubscribe()
    }
  }, [syncPendingUploadsFromQueue])

  const assignedProjects = useMemo(
    () => studentAssignWorksQuery?.data?.pages.flatMap((page) => page?.data?.data || []) ?? [],
    [studentAssignWorksQuery?.data?.pages],
  )

  const listItems = useMemo<ListItem[]>(() => {
    const items: ListItem[] = []

    items.push({
      id: "assigned-section",
      type: "assigned-section",
    })

    items.push({
      id: "assigned-items",
      type: "assigned-item",
      data: assignedProjects,
    })

    items.push({
      id: "my-section",
      type: "my-section",
    })

    for (let i = 0; i < myProjects.length; i += NUM_COLUMNS) {
      const rowItems = myProjects.slice(i, i + NUM_COLUMNS)
      items.push({
        id: `my-row-${i}`,
        type: "my-row",
        data: rowItems,
        index: Math.floor(i / NUM_COLUMNS),
      })
    }

    return items
  }, [assignedProjects, myProjects])

  const renderItem = useCallback(
    ({ item }: { item: ListItem }) => {
      switch (item.type) {
        case "assigned-section":
          return <StudentAssignedWorksTitle />

        case "assigned-item":
          return <StudentAssignedWorks {...studentAssignWorksQuery} />

        case "my-section":
          return (
            <>
              <StudentMyWorksTitle />
              {!isMyProjectsLoading && !myProjects.length && <NoData />}
            </>
          )

        case "my-row":
          return (
            <StudentMyWorks
              items={item.data as ProjectItem[] | (ProjectItem | ProjectFakeItem)[]}
            />
          )

        default:
          return null
      }
    },
    [studentAssignWorksQuery, isMyProjectsLoading],
  )

  return !isMyProjectsLoading &&
    !isStudentAssignWorksLoading &&
    !(studentAssignWorksQuery?.data?.pages.flatMap((page) => page?.data?.data || []) ?? [])
      .length &&
    !myProjects.length ? (
    <NoData />
  ) : (
    <View style={styles.container}>
      <FlatList
        data={listItems}
        keyExtractor={(item) => item.id}
        renderItem={renderItem}
        removeClippedSubviews={true}
        initialNumToRender={3}
        maxToRenderPerBatch={5}
        windowSize={5}
        onEndReached={() => {
          if (!isMyProjectsLoading && !isMyProjectsFetchingNextPage && hasNextMyProjectsPage) {
            fetchNextMyProjects()
          }
        }}
        onEndReachedThreshold={0.3}
        keyboardShouldPersistTaps="handled"
        scrollEventThrottle={16}
        refreshControl={
          <RefreshControl
            refreshing={isStudentAssignWorksLoading || isMyProjectsLoading}
            onRefresh={() => {
              startBackgroundOfflineSync("student").finally(() => {
                refetchAssigned()
                refetchMyProjects()
              })
            }}
            colors={[colors.palette.primary600]}
          />
        }
        ListEmptyComponent={
          <EmptyComponent loading={isMyProjectsLoading || isStudentAssignWorksLoading} />
        }
        ListFooterComponent={
          isStudentAssignWorksFetchingNextPage || isMyProjectsFetchingNextPage ? (
            <View style={styles.footerLoader}>
              <ActivityIndicator size="small" color={colors.text} />
            </View>
          ) : null
        }
        contentContainerStyle={styles.contentContainer}
      />
      {isSyncingPendingUploads && (
        <View style={styles.syncOverlay} pointerEvents="auto">
          <ActivityIndicator size="large" color={colors.palette.primary600} />
          <Text text="オフラインのアップロードを同期中…" style={styles.syncOverlayText} />
        </View>
      )}
    </View>
  )
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  contentContainer: {
    paddingBottom: moderateScale(50),
  },
  emptyContainer: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: moderateScale(40),
    justifyContent: "space-between",
    marginBottom: moderateScale(50),
    marginTop: moderateScale(16),
  },
  footerLoader: {
    alignItems: "center",
    paddingVertical: moderateScale(16),
    width: "100%",
  },
  skeletonItem: {
    flex: 1,
    justifyContent: "center",
    minWidth: "30%",
  },
  syncOverlay: {
    ...StyleSheet.absoluteFillObject,
    alignItems: "center",
    backgroundColor: "rgba(255, 255, 255, 0.92)",
    gap: moderateScale(12),
    justifyContent: "center",
    zIndex: 1000,
  },
  syncOverlayText: {
    color: colors.palette.secondary500,
    fontFamily: typography.fonts.zenKakuGothicNew.medium,
    fontSize: moderateScale(14),
  },
})
