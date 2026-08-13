import { afterEach, describe, expect, it } from 'vitest'
import { cleanup, render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { ToastProvider } from '../ToastProvider'
import { useToast } from '../useToast'

afterEach(() => {
  cleanup()
})

function ToastTrigger({ message, kind }: { message: string; kind: 'info' | 'error' }) {
  const { show } = useToast()

  return (
    <button type="button" onClick={() => show(message, kind)}>
      trigger
    </button>
  )
}

describe('Toast', () => {
  it('renders the message on screen when show is called with kind "info"', async () => {
    const user = userEvent.setup()

    render(
      <ToastProvider>
        <ToastTrigger message="Link copiado!" kind="info" />
      </ToastProvider>,
    )

    await user.click(screen.getByRole('button', { name: 'trigger' }))

    expect(screen.getByText('Link copiado!')).toBeInTheDocument()
  })

  it('applies the error style when show is called with kind "error"', async () => {
    const user = userEvent.setup()

    render(
      <ToastProvider>
        <ToastTrigger message="Erro ao deletar" kind="error" />
      </ToastProvider>,
    )

    await user.click(screen.getByRole('button', { name: 'trigger' }))

    expect(screen.getByText('Erro ao deletar')).toHaveClass('bg-danger')
  })
})
