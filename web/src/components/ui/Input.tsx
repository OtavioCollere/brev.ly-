import { useId } from 'react'
import type { InputHTMLAttributes } from 'react'

interface InputProps extends InputHTMLAttributes<HTMLInputElement> {
  label: string
  error?: string
}

export function Input({ label, error, id, className, ...props }: InputProps) {
  const generatedId = useId()
  const inputId = id ?? generatedId

  const inputClasses = [
    'w-full rounded-lg border px-4 py-3 text-md text-gray-600 outline-none focus:border-blue-base',
    error ? 'border-danger' : 'border-gray-300',
    className,
  ]
    .filter(Boolean)
    .join(' ')

  return (
    <div className="flex flex-col gap-2">
      <label
        htmlFor={inputId}
        className={`text-xs font-semibold uppercase ${error ? 'text-danger' : 'text-gray-500'}`}
      >
        {label}
      </label>
      <input id={inputId} className={inputClasses} {...props} />
      {error && (
        <span className="flex items-center gap-1 text-sm text-danger">
          <AlertIcon />
          {error}
        </span>
      )}
    </div>
  )
}

function AlertIcon() {
  return (
    <svg
      width="12"
      height="12"
      viewBox="0 0 24 24"
      fill="none"
      aria-hidden="true"
    >
      <path
        d="M12 3 2 20h20L12 3Z"
        stroke="currentColor"
        strokeWidth="1.5"
        strokeLinejoin="round"
      />
      <line
        x1="12"
        y1="9"
        x2="12"
        y2="14"
        stroke="currentColor"
        strokeWidth="1.5"
        strokeLinecap="round"
      />
      <circle cx="12" cy="17" r="1" fill="currentColor" />
    </svg>
  )
}
