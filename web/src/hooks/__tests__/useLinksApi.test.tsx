import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { renderHook, waitFor } from '@testing-library/react'
import type { ReactNode } from 'react'
import { afterEach, describe, expect, it, vi } from 'vitest'
import * as apiClient from '../../lib/api-client'
import { ApiError } from '../../lib/api-client'
import type { Link, PaginatedLinks } from '../../types'
import {
  useCreateLinkMutation,
  useDeleteLinkMutation,
  useExportCsvMutation,
  useLinksQuery,
  useResolveLinkQuery,
} from '../useLinksApi'

vi.mock('../../lib/api-client', async () => {
  const actual = await vi.importActual<typeof apiClient>('../../lib/api-client')
  return {
    ...actual,
    createLink: vi.fn(),
    listLinks: vi.fn(),
    deleteLink: vi.fn(),
    resolveLink: vi.fn(),
    exportLinks: vi.fn(),
  }
})

function link(overrides: Partial<Link> = {}): Link {
  return {
    id: 'link-1',
    originalUrl: 'https://example.com',
    shortUrl: 'abc',
    accessCount: 0,
    createdAt: '2026-08-10T00:00:00.000Z',
    ...overrides,
  }
}

function paginated(items: Link[]): PaginatedLinks {
  return { items, page: 1, limit: 10, total: items.length }
}

function createWrapper(client?: QueryClient) {
  const queryClient =
    client ??
    new QueryClient({
      defaultOptions: {
        queries: { retry: false },
        mutations: { retry: false },
      },
    })
  return {
    queryClient,
    Wrapper: ({ children }: { children: ReactNode }) => (
      <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
    ),
  }
}

afterEach(() => {
  vi.clearAllMocks()
})

describe('useLinksQuery', () => {
  it('fetches the requested page/limit and returns the paginated result', async () => {
    vi.mocked(apiClient.listLinks).mockResolvedValueOnce(paginated([link()]))
    const { Wrapper } = createWrapper()

    const { result } = renderHook(() => useLinksQuery(1, 10), {
      wrapper: Wrapper,
    })

    await waitFor(() => expect(result.current.isSuccess).toBe(true))

    expect(apiClient.listLinks).toHaveBeenCalledWith(1, 10)
    expect(result.current.data).toEqual(paginated([link()]))
  })
})

describe('useCreateLinkMutation', () => {
  it('invalidates the links list query on success, causing a refetch', async () => {
    vi.mocked(apiClient.listLinks).mockResolvedValue(paginated([]))
    vi.mocked(apiClient.createLink).mockResolvedValueOnce(link())
    const { Wrapper } = createWrapper()

    const { result: listResult } = renderHook(() => useLinksQuery(1, 10), {
      wrapper: Wrapper,
    })
    await waitFor(() => expect(listResult.current.isSuccess).toBe(true))
    expect(apiClient.listLinks).toHaveBeenCalledTimes(1)

    const { result: createResult } = renderHook(() => useCreateLinkMutation(), {
      wrapper: Wrapper,
    })
    createResult.current.mutate({
      originalUrl: 'https://example.com',
      shortUrl: 'abc',
    })
    await waitFor(() => expect(createResult.current.isSuccess).toBe(true))

    await waitFor(() => expect(apiClient.listLinks).toHaveBeenCalledTimes(2))
  })
})

describe('useDeleteLinkMutation', () => {
  it('optimistically removes the item from the list cache before the request settles', async () => {
    vi.mocked(apiClient.listLinks).mockResolvedValueOnce(
      paginated([link({ id: 'a' }), link({ id: 'b' })])
    )
    let resolveDelete: () => void = () => {}
    vi.mocked(apiClient.deleteLink).mockReturnValueOnce(
      new Promise<void>((resolve) => {
        resolveDelete = resolve
      })
    )
    const { Wrapper, queryClient } = createWrapper()

    const { result: listResult } = renderHook(() => useLinksQuery(1, 10), {
      wrapper: Wrapper,
    })
    await waitFor(() => expect(listResult.current.isSuccess).toBe(true))

    const { result: deleteResult } = renderHook(() => useDeleteLinkMutation(), {
      wrapper: Wrapper,
    })
    deleteResult.current.mutate('a')

    await waitFor(() => {
      const cached = queryClient.getQueryData<PaginatedLinks>(['links', 'list', 1, 10])
      expect(cached?.items.map((i) => i.id)).toEqual(['b'])
    })
    expect(
      queryClient.getQueryData<PaginatedLinks>(['links', 'list', 1, 10])?.total
    ).toBe(1)

    resolveDelete()
    await waitFor(() => expect(deleteResult.current.isSuccess).toBe(true))
  })

  it('rolls back the optimistic removal when the delete request fails', async () => {
    vi.mocked(apiClient.listLinks).mockResolvedValueOnce(
      paginated([link({ id: 'a' }), link({ id: 'b' })])
    )
    vi.mocked(apiClient.deleteLink).mockRejectedValueOnce(
      new ApiError('Falha ao deletar.', 500)
    )
    const { Wrapper, queryClient } = createWrapper()

    const { result: listResult } = renderHook(() => useLinksQuery(1, 10), {
      wrapper: Wrapper,
    })
    await waitFor(() => expect(listResult.current.isSuccess).toBe(true))

    const { result: deleteResult } = renderHook(() => useDeleteLinkMutation(), {
      wrapper: Wrapper,
    })
    deleteResult.current.mutate('a')

    await waitFor(() => expect(deleteResult.current.isError).toBe(true))

    const cached = queryClient.getQueryData<PaginatedLinks>(['links', 'list', 1, 10])
    expect(cached?.items.map((i) => i.id)).toEqual(['a', 'b'])
    expect(cached?.total).toBe(2)
  })
})

describe('useResolveLinkQuery', () => {
  it('does not retry on failure, even when the query client default allows retries', async () => {
    vi.mocked(apiClient.resolveLink).mockRejectedValue(new ApiError('not found', 404))
    const clientWithRetries = new QueryClient({
      defaultOptions: { queries: { retry: 3 } },
    })
    const { Wrapper } = createWrapper(clientWithRetries)

    const { result } = renderHook(() => useResolveLinkQuery('missing-slug'), {
      wrapper: Wrapper,
    })

    await waitFor(() => expect(result.current.isError).toBe(true))

    expect(apiClient.resolveLink).toHaveBeenCalledTimes(1)
  })

  it('returns the resolved original URL on success', async () => {
    vi.mocked(apiClient.resolveLink).mockResolvedValueOnce({
      originalUrl: 'https://example.com/destino',
    })
    const { Wrapper } = createWrapper()

    const { result } = renderHook(() => useResolveLinkQuery('abc'), {
      wrapper: Wrapper,
    })

    await waitFor(() => expect(result.current.isSuccess).toBe(true))
    expect(result.current.data).toEqual({ originalUrl: 'https://example.com/destino' })
  })
})

describe('useExportCsvMutation', () => {
  it('calls exportLinks and resolves with the returned url', async () => {
    vi.mocked(apiClient.exportLinks).mockResolvedValueOnce({
      url: 'https://cdn.example.com/links.csv',
    })
    const { Wrapper } = createWrapper()

    const { result } = renderHook(() => useExportCsvMutation(), { wrapper: Wrapper })
    result.current.mutate()

    await waitFor(() => expect(result.current.isSuccess).toBe(true))
    expect(apiClient.exportLinks).toHaveBeenCalledTimes(1)
    expect(result.current.data).toEqual({ url: 'https://cdn.example.com/links.csv' })
  })
})
