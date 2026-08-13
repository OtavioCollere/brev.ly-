import type { ReactNode } from 'react'
import { useEffect } from 'react'
import { useLocation } from 'react-router-dom'
import { Logo } from '../../components/ui/Logo'
import { useResolveLinkQuery } from '../../hooks/useLinksApi'
import { navigateTo } from '../../lib/navigate'

const REDIRECT_DELAY_MS = 1500

function getSlugFromPath(pathname: string): string {
  return pathname.split('/').filter(Boolean)[0] ?? ''
}

function CenteredCard({ children }: { children: ReactNode }) {
  return (
    <div className="flex min-h-screen items-center justify-center px-4">
      <div className="flex max-w-sm flex-col items-center gap-4 rounded-lg bg-white p-10 text-center">
        {children}
      </div>
    </div>
  )
}

export function RedirectOrNotFoundPage() {
  const location = useLocation()
  const slug = getSlugFromPath(location.pathname)
  const { data, isError } = useResolveLinkQuery(slug)

  useEffect(() => {
    if (!data) return

    const timeoutId = setTimeout(() => {
      navigateTo(data.originalUrl)
    }, REDIRECT_DELAY_MS)

    return () => clearTimeout(timeoutId)
  }, [data])

  if (isError) {
    return (
      <CenteredCard>
        <span className="text-xl font-bold text-blue-base">404</span>
        <h1 className="text-xl font-bold text-gray-600">Link não encontrado</h1>
        <p className="text-sm text-gray-500">
          O link que você está tentando acessar não existe, foi removido ou é
          uma URL inválida. Saiba mais em{' '}
          <a href="/" className="text-blue-base underline">
            brev.ly
          </a>
          .
        </p>
      </CenteredCard>
    )
  }

  return (
    <CenteredCard>
      <Logo />
      <h1 className="text-xl font-bold text-gray-600">Redirecionando...</h1>
      <p className="text-sm text-gray-500">
        O link será aberto automaticamente em alguns instantes.
      </p>
      <a
        href={data?.originalUrl}
        className="text-sm font-semibold text-blue-base underline"
      >
        Não foi redirecionado? Acesse aqui
      </a>
    </CenteredCard>
  )
}
