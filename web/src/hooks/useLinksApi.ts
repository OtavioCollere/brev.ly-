import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import {
  createLink,
  deleteLink,
  exportLinks,
  listLinks,
  resolveLink,
} from '../lib/api-client'
import type { Link, PaginatedLinks } from '../types'

const LINKS_LIST_KEY = ['links', 'list'] as const

export function useLinksQuery(page: number, limit: number) {
  return useQuery({
    queryKey: [...LINKS_LIST_KEY, page, limit],
    queryFn: () => listLinks(page, limit),
  })
}

export function useCreateLinkMutation() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: (input: { originalUrl: string; shortUrl: string }) =>
      createLink(input),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: LINKS_LIST_KEY })
    },
  })
}

export function useDeleteLinkMutation() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: (id: string) => deleteLink(id),
    onMutate: async (id: string) => {
      await queryClient.cancelQueries({ queryKey: LINKS_LIST_KEY })

      const previousQueries = queryClient.getQueriesData<PaginatedLinks>({
        queryKey: LINKS_LIST_KEY,
      })

      queryClient.setQueriesData<PaginatedLinks>(
        { queryKey: LINKS_LIST_KEY },
        (old) =>
          old
            ? {
                ...old,
                items: old.items.filter((link: Link) => link.id !== id),
                total: old.total - 1,
              }
            : old
      )

      return { previousQueries }
    },
    onError: (_error, _id, context) => {
      context?.previousQueries.forEach(([queryKey, data]) => {
        queryClient.setQueryData(queryKey, data)
      })
    },
  })
}

export function useResolveLinkQuery(shortUrl: string) {
  return useQuery({
    queryKey: ['links', 'resolve', shortUrl],
    queryFn: () => resolveLink(shortUrl),
    retry: false,
  })
}

export function useExportCsvMutation() {
  return useMutation({
    mutationFn: () => exportLinks(),
  })
}
