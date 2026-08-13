import type { ReactNode } from 'react'
import { describe, expect, it, vi } from 'vitest'
import { render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { NewLinkForm } from '../NewLinkForm'
import { ToastProvider } from '../../../components/Toast/ToastProvider'
import { useCreateLinkMutation } from '../../../hooks/useLinksApi'
import { ApiError } from '../../../lib/api-client'

vi.mock('../../../hooks/useLinksApi', () => ({
  useCreateLinkMutation: vi.fn(),
}))

function Wrapper({ children }: { children: ReactNode }) {
  return <ToastProvider>{children}</ToastProvider>
}

describe('NewLinkForm', () => {
  it('calls the mutation with the submitted data and clears the form on success (FORM-01)', async () => {
    const user = userEvent.setup()
    const mutate = vi.fn((_input, options) => {
      options?.onSuccess?.()
    })
    vi.mocked(useCreateLinkMutation).mockReturnValue({
      mutate,
      isPending: false,
    } as unknown as ReturnType<typeof useCreateLinkMutation>)

    render(<NewLinkForm />, { wrapper: Wrapper })

    const originalUrlInput = screen.getByLabelText('Link original')
    const shortUrlInput = screen.getByLabelText('Link encurtado')

    await user.type(originalUrlInput, 'https://exemplo.com.br')
    await user.type(shortUrlInput, 'meu-link')
    await user.click(screen.getByRole('button', { name: 'Salvar link' }))

    expect(mutate).toHaveBeenCalledWith(
      { originalUrl: 'https://exemplo.com.br', shortUrl: 'meu-link' },
      expect.anything(),
    )
    await waitFor(() => expect(originalUrlInput).toHaveValue(''))
    expect(shortUrlInput).toHaveValue('')
  })

  it.each([
    ['contains a space', 'meu link'],
    ['is empty', ''],
    ['contains a slash', 'meu/link'],
  ])(
    'shows an inline error and does not call the mutation when the slug %s (FORM-02)',
    async (_description, slugValue) => {
      const user = userEvent.setup()
      const mutate = vi.fn()
      vi.mocked(useCreateLinkMutation).mockReturnValue({
        mutate,
        isPending: false,
      } as unknown as ReturnType<typeof useCreateLinkMutation>)

      render(<NewLinkForm />, { wrapper: Wrapper })

      await user.type(screen.getByLabelText('Link original'), 'https://exemplo.com.br')
      const shortUrlInput = screen.getByLabelText('Link encurtado')
      if (slugValue) {
        await user.type(shortUrlInput, slugValue)
      } else {
        // touch the field so React Hook Form validates it while it stays empty
        await user.type(shortUrlInput, 'x{backspace}')
      }

      await user.click(screen.getByRole('button', { name: 'Salvar link' }))

      expect(mutate).not.toHaveBeenCalled()

      if (slugValue) {
        expect(
          screen.getByText(/letras, números, hífen e underline/i),
        ).toBeInTheDocument()
      } else {
        expect(screen.getByText(/informe o link encurtado/i)).toBeInTheDocument()
      }
    },
  )

  it('normalizes an original url without a protocol before submitting (FORM-03)', async () => {
    const user = userEvent.setup()
    const mutate = vi.fn()
    vi.mocked(useCreateLinkMutation).mockReturnValue({
      mutate,
      isPending: false,
    } as unknown as ReturnType<typeof useCreateLinkMutation>)

    render(<NewLinkForm />, { wrapper: Wrapper })

    await user.type(screen.getByLabelText('Link original'), 'www.exemplo.com.br')
    await user.type(screen.getByLabelText('Link encurtado'), 'meu-link')
    await user.click(screen.getByRole('button', { name: 'Salvar link' }))

    expect(mutate).toHaveBeenCalledWith(
      { originalUrl: 'https://www.exemplo.com.br', shortUrl: 'meu-link' },
      expect.anything(),
    )
  })

  it('shows an inline error for a url that stays invalid even after normalizing (FORM-03)', async () => {
    const user = userEvent.setup()
    const mutate = vi.fn()
    vi.mocked(useCreateLinkMutation).mockReturnValue({
      mutate,
      isPending: false,
    } as unknown as ReturnType<typeof useCreateLinkMutation>)

    render(<NewLinkForm />, { wrapper: Wrapper })

    await user.type(screen.getByLabelText('Link original'), 'não é uma url')
    await user.type(screen.getByLabelText('Link encurtado'), 'meu-link')
    await user.click(screen.getByRole('button', { name: 'Salvar link' }))

    expect(mutate).not.toHaveBeenCalled()
    expect(screen.getByText(/informe uma url válida/i)).toBeInTheDocument()
  })

  it('shows the 409 error message on the slug field without clearing the form (FORM-04)', async () => {
    const user = userEvent.setup()
    const mutate = vi.fn((_input, options) => {
      options?.onError?.(new ApiError('shortUrl já está em uso.', 409))
    })
    vi.mocked(useCreateLinkMutation).mockReturnValue({
      mutate,
      isPending: false,
    } as unknown as ReturnType<typeof useCreateLinkMutation>)

    render(<NewLinkForm />, { wrapper: Wrapper })

    const originalUrlInput = screen.getByLabelText('Link original')
    const shortUrlInput = screen.getByLabelText('Link encurtado')

    await user.type(originalUrlInput, 'https://exemplo.com.br')
    await user.type(shortUrlInput, 'meu-link')
    await user.click(screen.getByRole('button', { name: 'Salvar link' }))

    expect(await screen.findByText('shortUrl já está em uso.')).toBeInTheDocument()
    expect(originalUrlInput).toHaveValue('https://exemplo.com.br')
    expect(shortUrlInput).toHaveValue('meu-link')
  })

  it('disables the submit button when the fields are empty (FORM-05)', () => {
    vi.mocked(useCreateLinkMutation).mockReturnValue({
      mutate: vi.fn(),
      isPending: false,
    } as unknown as ReturnType<typeof useCreateLinkMutation>)

    render(<NewLinkForm />, { wrapper: Wrapper })

    expect(screen.getByRole('button', { name: 'Salvar link' })).toBeDisabled()
  })

  it('disables the submit button while the mutation is pending (FORM-05)', async () => {
    const user = userEvent.setup()
    vi.mocked(useCreateLinkMutation).mockReturnValue({
      mutate: vi.fn(),
      isPending: true,
    } as unknown as ReturnType<typeof useCreateLinkMutation>)

    render(<NewLinkForm />, { wrapper: Wrapper })

    await user.type(screen.getByLabelText('Link original'), 'https://exemplo.com.br')
    await user.type(screen.getByLabelText('Link encurtado'), 'meu-link')

    expect(screen.getByRole('button', { name: 'Salvar link' })).toBeDisabled()
  })
})
