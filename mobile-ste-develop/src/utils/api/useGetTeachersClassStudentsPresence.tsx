import { InfiniteData, useInfiniteQuery } from "@tanstack/react-query"

import { getTeachersClassStudentsPresence, GetTeachersClassStudentsPresenceData } from "@/client"
import { getTeachersClassStudentsPresenceQueryKey } from "@/client/@tanstack/react-query.gen"

export const useGetTeachersClassStudentsPresence = ({
  query,
}: {
  query: GetTeachersClassStudentsPresenceData["query"]
}) => {
  const fetchStudents = (query: GetTeachersClassStudentsPresenceData["query"]) => {
    return getTeachersClassStudentsPresence({
      query: {
        "class": query.class,
        "online_threshold": query?.["online_threshold"],
        "pagination[page]": query?.["pagination[page]"],
        "pagination[pageSize]": query?.["pagination[pageSize]"],
      },
    })
  }

  return useInfiniteQuery<
    Awaited<ReturnType<typeof getTeachersClassStudentsPresence>>,
    Error,
    InfiniteData<Awaited<ReturnType<typeof getTeachersClassStudentsPresence>>>,
    ReturnType<typeof getTeachersClassStudentsPresenceQueryKey>,
    GetTeachersClassStudentsPresenceData["query"]
  >({
    queryKey: getTeachersClassStudentsPresenceQueryKey({ query }),
    queryFn: ({ pageParam }) =>
      fetchStudents({
        "class": query.class,
        "online_threshold": query?.["online_threshold"],
        "pagination[page]": pageParam?.["pagination[page]"],
        "pagination[pageSize]": pageParam?.["pagination[pageSize]"],
      }),
    getNextPageParam: (lastPage) => {
      const currentPage = lastPage.data?.meta?.pagination?.page ?? 1
      const pageCount = lastPage.data?.meta?.pagination?.pageCount ?? 1
      const pageSize = query?.["pagination[pageSize]"] ?? lastPage.data?.meta?.pagination?.pageSize

      if (currentPage >= pageCount) {
        return undefined
      }

      return {
        "class": query.class,
        "online_threshold": query?.["online_threshold"],
        "pagination[page]": currentPage + 1,
        "pagination[pageSize]": pageSize,
      }
    },
    initialPageParam: {
      "class": query.class,
      "online_threshold": query?.["online_threshold"],
      "pagination[page]": 1,
      "pagination[pageSize]": query?.["pagination[pageSize]"],
    },
    refetchInterval: 30000,
  })
}
