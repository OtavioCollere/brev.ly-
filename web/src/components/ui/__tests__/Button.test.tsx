import { afterEach, describe, expect, it, vi } from 'vitest'
import { cleanup, render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { Button } from '../Button'

afterEach(() => {
  cleanup()
})

describe('Button', () => {
  it('does not call onClick when disabled and clicked', async () => {
    const user = userEvent.setup()
    const onClick = vi.fn()

    render(
      <Button disabled onClick={onClick}>
        Salvar link
      </Button>,
    )

    await user.click(screen.getByRole('button', { name: 'Salvar link' }))

    expect(onClick).not.toHaveBeenCalled()
  })

  it('renders the expected classes for the primary and secondary variants', () => {
    const { rerender } = render(<Button variant="primary">Salvar link</Button>)
    expect(screen.getByRole('button')).toHaveClass('bg-blue-base')

    rerender(<Button variant="secondary">Salvar link</Button>)
    expect(screen.getByRole('button')).toHaveClass('bg-gray-100')
  })
})
