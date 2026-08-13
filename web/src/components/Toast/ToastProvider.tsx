import { createContext, useCallback, useState } from 'react'
import type { ReactNode } from 'react'
import { createPortal } from 'react-dom'

export type ToastKind = 'info' | 'error'

export interface ToastContextValue {
  show: (message: string, kind: ToastKind) => void
}

interface ToastEntry {
  id: number
  message: string
  kind: ToastKind
}

export const ToastContext = createContext<ToastContextValue | null>(null)

let nextToastId = 0

export function ToastProvider({ children }: { children: ReactNode }) {
  const [toasts, setToasts] = useState<ToastEntry[]>([])

  const show = useCallback((message: string, kind: ToastKind) => {
    const id = nextToastId++
    setToasts((current) => [...current, { id, message, kind }])
    setTimeout(() => {
      setToasts((current) => current.filter((toast) => toast.id !== id))
    }, 4000)
  }, [])

  return (
    <ToastContext.Provider value={{ show }}>
      {children}
      {createPortal(
        <div className="fixed bottom-4 right-4 z-50 flex flex-col gap-2">
          {toasts.map((toast) => (
            <div
              key={toast.id}
              role="status"
              className={`rounded-lg px-4 py-3 text-sm text-white shadow-lg ${
                toast.kind === 'error' ? 'bg-danger' : 'bg-blue-base'
              }`}
            >
              {toast.message}
            </div>
          ))}
        </div>,
        document.body,
      )}
    </ToastContext.Provider>
  )
}
