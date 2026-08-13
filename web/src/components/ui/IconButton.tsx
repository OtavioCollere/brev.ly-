import type { ButtonHTMLAttributes, ReactNode } from 'react'

interface IconButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  icon: ReactNode
  'aria-label': string
}

export function IconButton({ icon, className, ...props }: IconButtonProps) {
  const classes = [
    'flex h-8 w-8 items-center justify-center rounded-md text-gray-400 transition-colors hover:text-blue-base disabled:cursor-not-allowed disabled:text-gray-300',
    className,
  ]
    .filter(Boolean)
    .join(' ')

  return (
    <button type="button" className={classes} {...props}>
      {icon}
    </button>
  )
}
