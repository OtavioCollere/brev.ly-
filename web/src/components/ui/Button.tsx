import type { ButtonHTMLAttributes, ReactNode } from 'react'

type ButtonVariant = 'primary' | 'secondary'

interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: ButtonVariant
  children: ReactNode
}

const baseClasses =
  'w-full rounded-lg px-4 py-3 text-center text-md font-semibold transition-colors disabled:cursor-not-allowed'

const variantClasses: Record<ButtonVariant, string> = {
  primary:
    'bg-blue-base text-white hover:bg-blue-dark disabled:bg-blue-base/40 disabled:text-white/80',
  secondary:
    'border border-transparent bg-gray-100 text-gray-600 hover:border-blue-base disabled:text-gray-300',
}

export function Button({
  variant = 'primary',
  className,
  children,
  ...props
}: ButtonProps) {
  const classes = [baseClasses, variantClasses[variant], className]
    .filter(Boolean)
    .join(' ')

  return (
    <button type="button" className={classes} {...props}>
      {children}
    </button>
  )
}
