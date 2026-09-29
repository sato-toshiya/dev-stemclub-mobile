import { InfiniteData, useInfiniteQuery } from "@tanstack/react-query"

import { getClassAssignmentsForStudent } from "@/client"
import { getClassAssignmentsForStudentQueryKey } from "@/client/@tanstack/react-query.gen"
import { GetClassAssignmentsForStudentData } from "@/client/types.gen"
import { getCachedAssignments } from "@/utils/offlineSync"

function buildCachedAssignmentsResponse() {
  const cached = getCachedAssignments()
  return {
    data: {
      data: cached,
      meta: {
        pagination: {
          page: 1,
          pageCount: 1,
          pageSize: cached.length,
          total: cached.length,
        },
      },
    },
  } as Awaited<ReturnType<typeof getClassAssignmentsForStudent>>
}

export const useGetClassAssignmentsForStudent = (
  query: GetClassAssignmentsForStudentData["query"] = {},
) => {
  const cachedAssignments = getCachedAssignments()
  const cachedPage = buildCachedAssignmentsResponse()

  const infiniteQuery = useInfiniteQuery<
    Awaited<ReturnType<typeof getClassAssignmentsForStudent>>,
    Error,
    InfiniteData<Awaited<ReturnType<typeof getClassAssignmentsForStudent>>>,
    ReturnType<typeof getClassAssignmentsForStudentQueryKey>,
    GetClassAssignmentsForStudentData["query"]
  >({
    queryKey: getClassAssignmentsForStudentQueryKey({
      query,
    }),
    queryFn: async () => {
      console.log(`[useGetClassAssignmentsForStudent] Requesting assignments`)
      try {
        const response = await getClassAssignmentsForStudent({
          query: query as GetClassAssignmentsForStudentData["query"],
        })
        if (response.error) {
          throw new Error((response.error as any).message || "Failed to fetch assignments")
        }
        return response
      } catch (e) {
        console.log("[useGetClassAssignmentsForStudent] Fetch failed, returning cache as fallback:", e)
        return buildCachedAssignmentsResponse()
      }
    },
    getNextPageParam: (lastPage) => {
      const currentPage = lastPage.data?.meta?.pagination?.page ?? 1
      const pageCount = lastPage.data?.meta?.pagination?.pageCount ?? 1
      const pageSize = lastPage.data?.meta?.pagination?.pageSize ?? query?.["pagination[pageSize]"]

      if (currentPage >= pageCount) {
        return undefined
      }

      return {
        "pagination[page]": currentPage + 1,
        "pagination[pageSize]": pageSize,
      }
    },
    initialPageParam: {
      "pagination[page]": 1,
      "pagination[pageSize]": query?.["pagination[pageSize]"],
    },
    staleTime: 5000,
    networkMode: "always",
  })

  return {
    ...infiniteQuery,
  }
}
