import type { ReactNode } from 'react'
import { describe, expect, it, vi } from 'vitest'
import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { LinksList } from '../LinksList'
import { ToastProvider } from '../../../components/Toast/ToastProvider'
import { useDeleteLinkMutation, useLinksQuery } from '../../../hooks/useLinksApi'
import type { Link } from '../../../types'

vi.mock('../../../hooks/useLinksApi', () => ({
  useLinksQuery: vi.fn(),
  useDeleteLinkMutation: vi.fn(),
}))

function Wrapper({ children }: { children: ReactNode }) {
  return <ToastProvider>{children}</ToastProvider>
}

function makeLink(id: string): Link {
  return {
    id,
    originalUrl: `https://exemplo.com.br/${id}`,
    shortUrl: `link-${id}`,
    accessCount: 0,
    createdAt: '2026-08-10T00:00:00.000Z',
  }
}

describe('LinksList', () => {
  it('shows a spinner while the query is loading (LIST-01)', () => {
    vi.mocked(useLinksQuery).mockReturnValue({
      data: undefined,
      isLoading: true,
      isError: false,
      refetch: vi.fn(),
    } as unknown as ReturnType<typeof useLinksQuery>)

    render(<LinksList />, { wrapper: Wrapper })

    expect(screen.getByRole('status', { name: 'Carregando' })).toBeInTheDocument()
  })

  it('shows the empty state when there are no links (LIST-02)', () => {
    vi.mocked(useLinksQuery).mockReturnValue({
      data: { items: [], page: 1, limit: 10, total: 0 },
      isLoading: false,
      isError: false,
      refetch: vi.fn(),
    } as unknown as ReturnType<typeof useLinksQuery>)

    render(<LinksList />, { wrapper: Wrapper })

    expect(
      screen.getByText(/ainda não existem links cadastrados/i),
    ).toBeInTheDocument()
  })

  it('shows an error message with a retry button that refetches the query (LIST-03)', async () => {
    const user = userEvent.setup()
    const refetch = vi.fn()
    vi.mocked(useLinksQuery).mockReturnValue({
      data: undefined,
      isLoading: false,
      isError: true,
      refetch,
    } as unknown as ReturnType<typeof useLinksQuery>)

    render(<LinksList />, { wrapper: Wrapper })

    const retryButton = screen.getByRole('button', { name: /tentar novamente/i })
    expect(retryButton).toBeInTheDocument()

    await user.click(retryButton)

    expect(refetch).toHaveBeenCalledTimes(1)
  })

  it('shows pagination controls that fetch the next page when total is greater than the limit (LIST-05)', async () => {
    const user = userEvent.setup()
    vi.mocked(useDeleteLinkMutation).mockReturnValue({
      mutate: vi.fn(),
    } as unknown as ReturnType<typeof useDeleteLinkMutation>)
    vi.mocked(useLinksQuery).mockImplementation(
      (page: number) =>
        ({
          data: {
            items: [makeLink('1'), makeLink('2')],
            page,
            limit: 10,
            total: 15,
          },
          isLoading: false,
          isError: false,
          refetch: vi.fn(),
        }) as unknown as ReturnType<typeof useLinksQuery>,
    )

    render(<LinksList />, { wrapper: Wrapper })

    const nextButton = screen.getByRole('button', { name: /próxima/i })
    expect(nextButton).toBeEnabled()

    await user.click(nextButton)

    expect(useLinksQuery).toHaveBeenLastCalledWith(2, 10)
  })

  it('does not show pagination controls when total is not greater than the limit (LIST-05)', () => {
    vi.mocked(useDeleteLinkMutation).mockReturnValue({
      mutate: vi.fn(),
    } as unknown as ReturnType<typeof useDeleteLinkMutation>)
    vi.mocked(useLinksQuery).mockReturnValue({
      data: { items: [makeLink('1')], page: 1, limit: 10, total: 1 },
      isLoading: false,
      isError: false,
      refetch: vi.fn(),
    } as unknown as ReturnType<typeof useLinksQuery>)

    render(<LinksList />, { wrapper: Wrapper })

    expect(screen.queryByRole('button', { name: /próxima/i })).not.toBeInTheDocument()
    expect(screen.queryByRole('button', { name: /anterior/i })).not.toBeInTheDocument()
  })
})
