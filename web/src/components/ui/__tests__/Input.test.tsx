import { afterEach, describe, expect, it } from 'vitest'
import { cleanup, render, screen } from '@testing-library/react'
import { Input } from '../Input'

afterEach(() => {
  cleanup()
})

describe('Input', () => {
  it('renders the label', () => {
    render(<Input label="Link original" />)

    expect(screen.getByText('Link original')).toBeInTheDocument()
  })

  it('shows the error message when error is passed, and hides it when absent', () => {
    const { rerender } = render(
      <Input label="Link encurtado" error="Link encurtado inválido" />,
    )
    expect(screen.getByText('Link encurtado inválido')).toBeInTheDocument()

    rerender(<Input label="Link encurtado" />)
    expect(
      screen.queryByText('Link encurtado inválido'),
    ).not.toBeInTheDocument()
  })
})
