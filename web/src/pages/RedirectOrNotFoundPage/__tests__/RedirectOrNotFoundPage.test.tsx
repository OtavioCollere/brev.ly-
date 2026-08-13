import { afterEach, describe, expect, it, vi } from 'vitest'
import { render, screen } from '@testing-library/react'
import { MemoryRouter } from 'react-router-dom'
import { RedirectOrNotFoundPage } from '../RedirectOrNotFoundPage'
import { useResolveLinkQuery } from '../../../hooks/useLinksApi'
import { navigateTo } from '../../../lib/navigate'

vi.mock('../../../hooks/useLinksApi', () => ({
  useResolveLinkQuery: vi.fn(),
}))

vi.mock('../../../lib/navigate', () => ({
  navigateTo: vi.fn(),
}))

function renderPage(path = '/meu-link') {
  return render(
    <MemoryRouter initialEntries={[path]}>
      <RedirectOrNotFoundPage />
    </MemoryRouter>,
  )
}

afterEach(() => {
  vi.mocked(navigateTo).mockClear()
  vi.useRealTimers()
})

describe('RedirectOrNotFoundPage', () => {
  it('shows the "Redirecionando..." card when the link resolves successfully (REDIR-01)', () => {
    vi.mocked(useResolveLinkQuery).mockReturnValue({
      data: { originalUrl: 'https://exemplo.com.br/destino' },
      isError: false,
    } as unknown as ReturnType<typeof useResolveLinkQuery>)

    renderPage()

    expect(screen.getByText('Redirecionando...')).toBeInTheDocument()
  })

  it('sets the "Acesse aqui" link href to the resolved original url as soon as the query resolves (REDIR-01, REDIR-02)', () => {
    vi.mocked(useResolveLinkQuery).mockReturnValue({
      data: { originalUrl: 'https://exemplo.com.br/destino' },
      isError: false,
    } as unknown as ReturnType<typeof useResolveLinkQuery>)

    renderPage()

    expect(screen.getByRole('link', { name: /acesse aqui/i })).toHaveAttribute(
      'href',
      'https://exemplo.com.br/destino',
    )
  })

  it('calls navigateTo with the original url ~1500ms after resolving successfully (REDIR-01)', () => {
    vi.useFakeTimers()
    vi.mocked(useResolveLinkQuery).mockReturnValue({
      data: { originalUrl: 'https://exemplo.com.br/destino' },
      isError: false,
    } as unknown as ReturnType<typeof useResolveLinkQuery>)

    renderPage()

    expect(navigateTo).not.toHaveBeenCalled()

    vi.advanceTimersByTime(1500)

    expect(navigateTo).toHaveBeenCalledWith('https://exemplo.com.br/destino')
  })

  it('shows the "Link não encontrado" content when resolving fails — same for an unknown slug and for any other unmatched route (REDIR-03, NF-01)', () => {
    vi.mocked(useResolveLinkQuery).mockReturnValue({
      data: undefined,
      isError: true,
    } as unknown as ReturnType<typeof useResolveLinkQuery>)

    renderPage('/rota-qualquer-inexistente')

    expect(screen.getByText('Link não encontrado')).toBeInTheDocument()
  })
})
