import { useCallback, useEffect, useMemo, useRef, useState } from "react"
import {
  ActivityIndicator,
  FlatList,
  Pressable,
  Platform,
  RefreshControl,
  StyleSheet,
  View,
} from "react-native"
import NetInfo from "@react-native-community/netinfo"
import { router, useFocusEffect } from "expo-router"
import { useMutation, useQueryClient } from "@tanstack/react-query"
import Skeleton from "react-native-reanimated-skeleton"
import { Toast } from "toastify-react-native"

import { ProjectItem, UploadFile } from "@/client"
import {
  getProjectsMyQueryKey,
  postClassAssignmentsAssignMutation,
} from "@/client/@tanstack/react-query.gen"
import { AutoImage } from "@/components/AutoImage"
import { Button } from "@/components/Button"
import { Icon } from "@/components/Icon"
import { NoData } from "@/components/NoData"
import { Text } from "@/components/Text"
import { ProjectCard } from "@/components/works/ProjectCard"
import { translate } from "@/i18n/translate"
import { useAuthToken } from "@/stores/auth/auth.selectors"
import { useClassStore } from "@/stores/class/class.store"
import { colors } from "@/theme/colors"
import { moderateScale } from "@/theme/spacing"
import { typography } from "@/theme/typography"
import { useGetMyProjects } from "@/utils/api"
import { formatDate } from "@/utils/formatDate"
import { resolveOfflineAssetUri, startBackgroundOfflineSync } from "@/utils/offlineSync"
import {
  getPendingUploads,
  resolvePendingProjectLocalUri,
  syncPendingUploads,
} from "@/utils/scratchjrPendingUploads"

const PAGE_SIZE = 10

const EmptyComponent = ({ loading }: { loading: boolean }) => (
  <FlatList
    data={Array(10).fill(1)}
    style={[{ marginBottom: moderateScale(50) }, styles.row]}
    columnWrapperStyle={styles.row}
    numColumns={2}
    renderItem={({ index }) => (
      <Skeleton
        key={index}
        isLoading={loading}
        containerStyle={styles.item}
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
    )}
  />
)

const ClassWorksItem = ({
  item,
  selected,
  onSelect,
}: {
  item:
    | ProjectItem
    | {
        id: string
        thumbnail: null
        title: string
        createdAt: string
        documentId: string
        fakeItem: boolean
        sjr_file: null
      }
  selected: boolean
  onSelect?: (id: string) => void
}) => {
  const { thumbnail, title, createdAt, documentId } = item ?? {}
  if (item.fakeItem) return <View style={styles.item} />
  const handleOpenProject = (
    sjr_file: UploadFile,
    documentId: ProjectItem["documentId"],
    title: ProjectItem["title"],
  ) => {
    const pendingLocalUri = resolvePendingProjectLocalUri({
      projectId: documentId,
      title,
    })
    const resolvedFilePath = pendingLocalUri || resolveOfflineAssetUri(sjr_file?.url)
    if (!resolvedFilePath) {
      return
    }
    router.push({
      pathname: "/scratchjr",
      params: {
        filepath: resolvedFilePath,
        filename: title,
        projectId: documentId,
        mode: "edit",
      },
    })
  }

  return (
    <Pressable
      style={styles.itemPressable}
      onPress={() =>
        onSelect
          ? onSelect(documentId)
          : handleOpenProject(item.sjr_file as UploadFile, documentId, title)
      }
    >
      <ProjectCard style={[styles.item, selected && styles.selectedItem]}>
        {selected && <Icon icon="circleCheck" style={styles.iconCheck} size={moderateScale(18)} />}
        <AutoImage
          source={{
            uri: resolveOfflineAssetUri(thumbnail?.url),
          }}
          resizeMode="contain"
          style={styles.projectThumbnail}
        />
        <Text style={styles.projectTitle}>{title}</Text>
        <Text style={styles.projectMeta}>
          {translate("works:created_at")}:{formatDate(createdAt, "yyyyMMdd")}
        </Text>
      </ProjectCard>
    </Pressable>
  )
}
export const ClassWorksScreen = () => {
  const queryClient = useQueryClient()
  const token = useAuthToken()
  const [isSelectMode, setIsSelectMode] = useState(false)
  const [selectedWorks, setSelectedWorks] = useState<string[]>([])
  const [isSyncingPendingUploads, setIsSyncingPendingUploads] = useState(false)
  const isSyncingPendingUploadsRef = useRef(false)
  const lastOnlineRef = useRef<boolean | null>(null)
  const lastSyncAttemptAtRef = useRef(0)
  const { selectedClass } = useClassStore()

  const query = useMemo(
    () => ({
      "pagination[pageSize]": PAGE_SIZE,
    }),
    [],
  )
  const { data, fetchNextPage, isLoading, hasNextPage, isFetchingNextPage, refetch } =
    useGetMyProjects({
      query,
    })

  useFocusEffect(
    useCallback(() => {
      refetch()
    }, [refetch]),
  )

  const projects = useMemo(() => {
    const flattened = data?.pages.flatMap((page) => page?.data?.data || []) ?? []
    if (flattened.length === 0 && data?.pages) {
      console.log("[ClassWorksScreen] projects is 0, pages structure:", JSON.stringify(data?.pages, null, 2))
    }
    return flattened
  }, [data?.pages])

  const handleSelectWork = (id: string) =>
    setSelectedWorks(
      selectedWorks.includes(id)
        ? selectedWorks.filter((workId) => workId !== id)
        : [...selectedWorks, id],
    )

  const { mutate: assignWorks, isPending } = useMutation({
    ...postClassAssignmentsAssignMutation(),
    onSuccess: () => {
      setSelectedWorks([])
      refetch()
      Toast.success(translate("works:assign_success"))
    },
  })

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
        await startBackgroundOfflineSync("teacher")
        queryClient.invalidateQueries({ queryKey: getProjectsMyQueryKey() })
        refetch()
      }
    } finally {
      isSyncingPendingUploadsRef.current = false
      setIsSyncingPendingUploads(false)
    }
  }, [queryClient, refetch, token])

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

  return (
    <View style={styles.container}>
      <View style={styles.actionView}>
        <View style={styles.titleView}>
          <Icon icon="layoutGrid" size={moderateScale(24)} />
          <Text tx="works:teacher_works" size="sm" />
        </View>
        <View style={styles.assignButtonView}>
          <Text tx="works:selected_works" txOptions={{ count: selectedWorks.length }} />

          <Button
            shape="rounded"
            textStyle={{
              color: colors.palette.neutral900,
              fontFamily: typography.fonts.zenKakuGothicNew.normal,
            }}
            style={[
              styles.assignButton,
              {
                backgroundColor: colors.palette.neutral100,
              },
            ]}
            disabled={!projects.length}
            LeftAccessory={
              <Icon
                icon={isSelectMode ? "x" : "circleCheck"}
                style={{
                  width: moderateScale(17),
                  height: moderateScale(24),
                }}
              />
            }
            onPress={() => {
              setIsSelectMode((prev) => {
                if (prev) {
                  setSelectedWorks([])
                }
                return !prev
              })
            }}
            tx={isSelectMode ? "works:deselect" : "works:choose"}
          />
          <Button
            LeftAccessory={
              <Icon
                icon="goldMedal"
                style={{ width: moderateScale(17), height: moderateScale(24) }}
              />
            }
            tx="works:assign_work"
            shape="rounded"
            textStyle={{
              color: colors.palette.neutral100,
              fontFamily: typography.fonts.zenKakuGothicNew.normal,
            }}
            disabled={isPending || !selectedWorks.length}
            style={styles.assignButton}
            onPress={() => {
              if (!selectedClass?.documentId) return
              assignWorks({
                body: {
                  class: selectedClass?.documentId,
                  projectIds: selectedWorks,
                },
              })
              setSelectedWorks([])
              setIsSelectMode(false)
            }}
          />
        </View>
      </View>
      {!isLoading && projects.length === 0 ? (
        <NoData />
      ) : (
        <FlatList
          removeClippedSubviews={true}
          data={
            projects.length % 2 === 0
              ? projects
              : [
                  ...projects,
                  {
                    id: Math.random().toString(),
                    thumbnail: null,
                    title: "fake-title",
                    createdAt: new Date().toISOString(),
                    documentId: "fake-document-id",
                    fakeItem: true,
                    sjr_file: null,
                  },
                ]
          }
          style={{ marginBottom: moderateScale(50) }}
          columnWrapperStyle={styles.row}
          numColumns={2}
          keyExtractor={(item) => item.id.toString()}
          renderItem={({ item }) => (
            <ClassWorksItem
              item={item}
              selected={selectedWorks.includes(item.documentId)}
              onSelect={isSelectMode ? handleSelectWork : undefined}
            />
          )}
          onEndReached={() => {
            if (isLoading || isFetchingNextPage) return

            if (hasNextPage) {
              fetchNextPage()
            }
          }}
          onEndReachedThreshold={0.5}
          keyboardShouldPersistTaps="handled"
          scrollEventThrottle={16}
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
          ListEmptyComponent={<EmptyComponent loading={isLoading} />}
          ListFooterComponent={
            isFetchingNextPage ? <ActivityIndicator size="small" color={colors.text} /> : null
          }
        />
      )}

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
  actionView: {
    alignItems: "center",
    flexDirection: "row",
    justifyContent: "space-between",
  },
  assignButton: {
    alignItems: "flex-start",
    alignSelf: "flex-start",
    backgroundColor: colors.palette.indigo600,
    gap: moderateScale(4),
  },
  assignButtonView: {
    alignItems: "center",
    flexDirection: "row",
    gap: moderateScale(18),
  },
  iconCheck: {
    position: "absolute",
    right: moderateScale(0),
    top: moderateScale(0),
  },
  item: {
    borderColor: colors.palette.transparent,
    borderWidth: 1,
    flex: 1,
    justifyContent: "center",
  },
  itemPressable: {
    borderRadius: moderateScale(16),
    flex: 1,
    marginTop: moderateScale(30),
    width: "100%",
  },
  projectMeta: {
    color: colors.palette.secondary300,
    fontFamily: typography.fonts.zenKakuGothicNew.medium,
    fontSize: moderateScale(13),
    lineHeight: moderateScale(18),
  },
  projectThumbnail: {
    flex: 1,
    height: moderateScale(129),
    objectFit: "contain",
    width: "100%",
  },
  projectTitle: {
    color: colors.palette.secondary300,
    fontFamily: typography.fonts.zenKakuGothicNew.bold,
    fontSize: moderateScale(17),
    lineHeight: moderateScale(24),
  },
  row: {
    gap: moderateScale(40),
    justifyContent: "space-between",
  },
  selectedItem: {
    borderColor: colors.palette.green600,
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
  titleView: {
    alignItems: "center",
    flexDirection: "row",
    gap: moderateScale(8),
  },
})
