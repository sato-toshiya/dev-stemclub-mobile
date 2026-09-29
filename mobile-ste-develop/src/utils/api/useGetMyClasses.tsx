import { InfiniteData, useInfiniteQuery } from "@tanstack/react-query"

import { getClassesMy, GetClassesMyData } from "@/client"
import { getClassesMyQueryKey } from "@/client/@tanstack/react-query.gen"
import { getCachedClasses } from "@/utils/offlineSync"

function buildCachedClassesResponse() {
  const cached = getCachedClasses()
  console.log(`[useGetMyClasses] Building cached response with ${cached.length} classes`)
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
  } as Awaited<ReturnType<typeof getClassesMy>>
}

export const useGetMyClasses = ({ query }: { query: GetClassesMyData["query"] }) => {
  const cachedClasses = getCachedClasses()
  const cachedPage = buildCachedClassesResponse()

  const queryResult = useInfiniteQuery<
    Awaited<ReturnType<typeof getClassesMy>>,
    Error,
    InfiniteData<Awaited<ReturnType<typeof getClassesMy>>>,
    ReturnType<typeof getClassesMyQueryKey>,
    GetClassesMyData["query"]
  >({
    queryKey: getClassesMyQueryKey({ query }),
    queryFn: async ({ pageParam }) => {
      console.log(`[useGetMyClasses] Requesting page:`, pageParam)
      try {
        const response = await getClassesMy({
          query: pageParam as GetClassesMyData["query"],
        })
        if (response.error) {
          throw new Error((response.error as any).message || "Failed to fetch classes")
        }
        return response
      } catch (e) {
        console.log("[useGetMyClasses] Fetch failed, returning cache as fallback:", e)
        return buildCachedClassesResponse()
      }
    },
    getNextPageParam: (lastPage) => {
      const currentPage = lastPage.data?.meta?.pagination?.page ?? 1
      const pageCount = lastPage.data?.meta?.pagination?.pageCount ?? 1
      const pageSize = query?.["pagination[pageSize]"] ?? lastPage.data?.meta?.pagination?.pageSize

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

  return queryResult
}
