import type { ReactNode } from 'react'
import { afterEach, describe, expect, it, vi } from 'vitest'
import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { LinkListItem } from '../LinkListItem'
import { ToastProvider } from '../../../components/Toast/ToastProvider'
import { useDeleteLinkMutation } from '../../../hooks/useLinksApi'
import type { Link } from '../../../types'

vi.mock('../../../hooks/useLinksApi', () => ({
  useDeleteLinkMutation: vi.fn(),
}))

const link: Link = {
  id: 'link-1',
  originalUrl: 'https://exemplo.com.br',
  shortUrl: 'meu-link',
  accessCount: 3,
  createdAt: '2026-08-10T00:00:00.000Z',
}

function Wrapper({ children }: { children: ReactNode }) {
  return <ToastProvider>{children}</ToastProvider>
}

describe('LinkListItem', () => {
  afterEach(() => {
    // @ts-expect-error cleanup of the test-only clipboard override
    delete window.navigator.clipboard
  })

  it('copies the full short url to the clipboard and shows a toast when clicking the link text (LIST-04)', async () => {
    const user = userEvent.setup()
    // userEvent.setup() installs its own clipboard stub, so the mock must be
    // applied after setup() or it gets overwritten.
    Object.defineProperty(window.navigator, 'clipboard', {
      value: { writeText: vi.fn().mockResolvedValue(undefined) },
      configurable: true,
    })
    vi.mocked(useDeleteLinkMutation).mockReturnValue({
      mutate: vi.fn(),
    } as unknown as ReturnType<typeof useDeleteLinkMutation>)

    render(<LinkListItem link={link} />, { wrapper: Wrapper })

    await user.click(screen.getByText('brev.ly/meu-link'))

    expect(navigator.clipboard.writeText).toHaveBeenCalledWith(
      'https://brev.ly/meu-link',
    )
    expect(await screen.findByText('Link copiado!')).toBeInTheDocument()
  })

  it('calls the delete mutation with the link id when clicking the trash icon (DEL-01)', async () => {
    const user = userEvent.setup()
    const mutate = vi.fn()
    vi.mocked(useDeleteLinkMutation).mockReturnValue({
      mutate,
    } as unknown as ReturnType<typeof useDeleteLinkMutation>)

    render(<LinkListItem link={link} />, { wrapper: Wrapper })

    await user.click(screen.getByRole('button', { name: 'Deletar link' }))

    expect(mutate).toHaveBeenCalledWith('link-1', expect.anything())
  })

  it('shows an error toast when the delete mutation fails (DEL-02)', async () => {
    const user = userEvent.setup()
    const mutate = vi.fn((_id, options) => {
      options?.onError?.(new Error('fail'))
    })
    vi.mocked(useDeleteLinkMutation).mockReturnValue({
      mutate,
    } as unknown as ReturnType<typeof useDeleteLinkMutation>)

    render(<LinkListItem link={link} />, { wrapper: Wrapper })

    await user.click(screen.getByRole('button', { name: 'Deletar link' }))

    expect(await screen.findByText('Erro ao deletar o link.')).toBeInTheDocument()
  })
})
