import { useClassStore } from "@/stores/class/class.store"
import { moderateScale } from "@/theme/spacing"
import { useGetMyClasses } from "@/utils/api"

import { Select } from "../Select"

export const ClassSelect = () => {
  const { selectedClass, setClass } = useClassStore()
  const { data, fetchNextPage, isLoading, hasNextPage, isFetchingNextPage, refetch } =
    useGetMyClasses({
      query: {
        "pagination[pageSize]": 10,
      },
    })
  const classes = data?.pages.flatMap((page) => page?.data?.data || []) ?? []
  return (
    <Select
      options={classes.map((classItem) => ({ label: classItem.name, value: classItem.documentId }))}
      hasMore={hasNextPage}
      isLoadingMore={isFetchingNextPage}
      onLoadMore={fetchNextPage}
      isLoading={isLoading}
      value={selectedClass?.documentId}
      onSelect={(value) => {
        const selectedClass = classes.find((classItem) => classItem.documentId === value)
        if (selectedClass) {
          setClass(selectedClass)
        }
      }}
      refetch={refetch}
      selectWrapperStyle={{ width: moderateScale(200) }}
      truncateSelectedText
      truncateOptionText
    />
  )
}
