import { Pressable, StyleSheet, View } from "react-native"
import { router } from "expo-router"

import { ProjectItem, UploadFile } from "@/client"
import { AutoImage } from "@/components/AutoImage"
import { Text } from "@/components/Text"
import { ProjectCard } from "@/components/works/ProjectCard"
import { translate } from "@/i18n/translate"
import { colors } from "@/theme/colors"
import { moderateScale } from "@/theme/spacing"
import { typography } from "@/theme/typography"
import { formatDate } from "@/utils/formatDate"
import { resolveOfflineAssetUri } from "@/utils/offlineSync"
import { resolvePendingProjectLocalUri } from "@/utils/scratchjrPendingUploads"

import { ProjectFakeItem } from "../StudentWorksScreen"

export type MyWorksItemType =
  | ProjectItem
  | {
      id: number
      updatedAt: string
      title: string
      thumbnail: null
      sjr_file: null
      documentId: string
      fakeItem: boolean
    }

export const StudentMyWorksItem = ({
  item,
  itemStyle,
  itemPressableStyle,
}: {
  item: MyWorksItemType
  itemStyle?: any
  itemPressableStyle?: any
}) => {
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
  const { thumbnail, title, updatedAt, sjr_file, documentId } = item ?? {}
  return item?.fakeItem ? (
    <View style={[styles.item, itemStyle]} />
  ) : (
    <Pressable
      style={[styles.itemPressable, itemPressableStyle]}
      onPress={() => handleOpenProject(sjr_file as UploadFile, documentId, title)}
    >
      <ProjectCard style={[styles.item, itemStyle]}>
        <AutoImage
          source={{
            uri: resolveOfflineAssetUri(thumbnail?.url),
          }}
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
          {translate("works:updated_at")}: {formatDate(updatedAt, "yyyyMMdd")}
        </Text>
      </ProjectCard>
    </Pressable>
  )
}

type Props = {
  items: ProjectItem[] | (ProjectItem | ProjectFakeItem)[]
}

export const StudentMyWorks = ({ items }: Props) => {
  if (Array.isArray(items)) {
    return (
      <View style={styles.myWorksRow}>
        {items.map((project) => (
          <View key={project.id.toString()} style={styles.myWorksItemWrapper}>
            <StudentMyWorksItem
              item={project as MyWorksItemType}
              itemStyle={styles.myWorksItem}
              itemPressableStyle={styles.itemPressable}
            />
          </View>
        ))}
      </View>
    )
  }
  return null
}

const styles = StyleSheet.create({
  item: {
    flex: 1,
    justifyContent: "center",
  },
  itemPressable: {
    borderRadius: moderateScale(16),
    flex: 1,
    height: moderateScale(220),
    marginTop: moderateScale(24),
  },
  myWorksItem: {
    borderRadius: moderateScale(16),
    flex: 1,
    height: moderateScale(220),
    justifyContent: "center",
    marginTop: moderateScale(24),
  },
  myWorksItemWrapper: {
    flex: 1,
  },
  myWorksRow: {
    flexDirection: "row",
    gap: moderateScale(40),
    justifyContent: "space-between",
  },
  projectThumbnail: {
    flex: 1,
    height: moderateScale(129),
    objectFit: "contain",
    width: "100%",
  },
})
