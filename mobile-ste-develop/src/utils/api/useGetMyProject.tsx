import { InfiniteData, useInfiniteQuery } from "@tanstack/react-query"

import { getProjectsMy } from "@/client"
import { getProjectsMyQueryKey } from "@/client/@tanstack/react-query.gen"
import { GetProjectsMyData } from "@/client/types.gen"
import { getCachedProjects, mergeProjectsWithCache } from "@/utils/offlineSync"

function buildCachedProjectsResponse() {
  const cached = getCachedProjects()
  console.log(`[useGetMyProjects] Building cached response with ${cached.length} projects`)
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
  } as Awaited<ReturnType<typeof getProjectsMy>>
}

export const useGetMyProjects = ({ query }: { query?: GetProjectsMyData["query"] } = {}) => {
  const cachedProjects = getCachedProjects()
  const cachedPage = buildCachedProjectsResponse()

  const infiniteQuery = useInfiniteQuery<
    Awaited<ReturnType<typeof getProjectsMy>>,
    Error,
    InfiniteData<Awaited<ReturnType<typeof getProjectsMy>>>,
    ReturnType<typeof getProjectsMyQueryKey>,
    any
  >({
    queryKey: getProjectsMyQueryKey({ query }),
    queryFn: async ({ pageParam }) => {
      console.log(`[useGetMyProjects] Requesting page:`, pageParam)
      try {
        const response = await getProjectsMy({
          query: pageParam as any,
        })
        if (response.error) {
          throw new Error((response.error as any).message || "Failed to fetch projects")
        }

        const isFirstPage =
          !pageParam ||
          (pageParam as any)?.["pagination[page]"] === 1 ||
          !(pageParam as any)?.["pagination[page]"]

        // Merge with cache to preserve local-only projects that haven't been synced yet
        // Only append local-only projects to the first page to avoid duplication in infinite scroll
        if (response.data?.data) {
          response.data.data = mergeProjectsWithCache(response.data.data, isFirstPage)
        }

        return response
      } catch (e) {
        console.log("[useGetMyProjects] Fetch failed, returning cache as fallback:", e)
        return buildCachedProjectsResponse()
      }
    },
    getNextPageParam: (lastPage) => {
      const currentPage = lastPage.data?.meta?.pagination?.page ?? 1
      const pageCount = lastPage.data?.meta?.pagination?.pageCount ?? 1
      const pageSize = lastPage.data?.meta?.pagination?.pageSize ?? query?.["pagination[pageSize]"]

      if (currentPage >= pageCount) {
        console.log("[useGetMyProjects] No more pages to load.")
        return undefined
      }

      return {
        "pagination[page]": currentPage + 1,
        "pagination[pageSize]": pageSize,
        sort: ["updatedAt:desc"],
      }
    },
    initialPageParam: {
      "pagination[page]": 1,
      "pagination[pageSize]": query?.["pagination[pageSize]"],
      sort: ["updatedAt:desc"],
    },
    staleTime: 5000,
    networkMode: "always",
  })

  return {
    ...infiniteQuery,
  }
}
