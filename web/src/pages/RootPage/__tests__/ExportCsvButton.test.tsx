import type { ReactNode } from 'react'
import { afterEach, describe, expect, it, vi } from 'vitest'
import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { ExportCsvButton } from '../ExportCsvButton'
import { ToastProvider } from '../../../components/Toast/ToastProvider'
import { useExportCsvMutation } from '../../../hooks/useLinksApi'
import { navigateTo } from '../../../lib/navigate'

vi.mock('../../../hooks/useLinksApi', () => ({
  useExportCsvMutation: vi.fn(),
}))

vi.mock('../../../lib/navigate', () => ({
  navigateTo: vi.fn(),
}))

function Wrapper({ children }: { children: ReactNode }) {
  return <ToastProvider>{children}</ToastProvider>
}

afterEach(() => {
  vi.mocked(navigateTo).mockClear()
})

describe('ExportCsvButton', () => {
  it('enables the button when linksCount > 0 and navigates to the returned url on success (CSV-01)', async () => {
    const user = userEvent.setup()
    const mutate = vi.fn((_input, options) => {
      options?.onSuccess?.({ url: 'https://cdn.example.com/links.csv' })
    })
    vi.mocked(useExportCsvMutation).mockReturnValue({
      mutate,
      isPending: false,
    } as unknown as ReturnType<typeof useExportCsvMutation>)

    render(<ExportCsvButton linksCount={3} />, { wrapper: Wrapper })

    const button = screen.getByRole('button', { name: /baixar csv/i })
    expect(button).toBeEnabled()

    await user.click(button)

    expect(navigateTo).toHaveBeenCalledWith('https://cdn.example.com/links.csv')
  })

  it('disables the button and does not call the mutation when linksCount is 0 (CSV-02)', async () => {
    const user = userEvent.setup()
    const mutate = vi.fn()
    vi.mocked(useExportCsvMutation).mockReturnValue({
      mutate,
      isPending: false,
    } as unknown as ReturnType<typeof useExportCsvMutation>)

    render(<ExportCsvButton linksCount={0} />, { wrapper: Wrapper })

    const button = screen.getByRole('button', { name: /baixar csv/i })
    expect(button).toBeDisabled()

    await user.click(button)

    expect(mutate).not.toHaveBeenCalled()
  })

  it('shows an error toast and does not navigate when the export fails (CSV-03)', async () => {
    const user = userEvent.setup()
    const mutate = vi.fn((_input, options) => {
      options?.onError?.(new Error('fail'))
    })
    vi.mocked(useExportCsvMutation).mockReturnValue({
      mutate,
      isPending: false,
    } as unknown as ReturnType<typeof useExportCsvMutation>)

    render(<ExportCsvButton linksCount={2} />, { wrapper: Wrapper })

    await user.click(screen.getByRole('button', { name: /baixar csv/i }))

    expect(await screen.findByText('Erro ao exportar CSV.')).toBeInTheDocument()
    expect(navigateTo).not.toHaveBeenCalled()
  })
})
