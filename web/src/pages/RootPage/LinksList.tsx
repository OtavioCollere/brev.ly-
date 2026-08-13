import { useState } from 'react'
import { Button } from '../../components/ui/Button'
import { Spinner } from '../../components/ui/Spinner'
import { useLinksQuery } from '../../hooks/useLinksApi'
import { LinkListItem } from './LinkListItem'

export const LINKS_LIST_LIMIT = 10

export function LinksList() {
  const [page, setPage] = useState(1)
  const { data, isLoading, isError, refetch } = useLinksQuery(
    page,
    LINKS_LIST_LIMIT,
  )

  if (isLoading) {
    return (
      <div className="flex justify-center py-10">
        <Spinner />
      </div>
    )
  }

  if (isError) {
    return (
      <div className="flex flex-col items-center gap-4 py-10 text-center">
        <p className="text-sm text-gray-500">
          Não foi possível carregar seus links.
        </p>
        <Button
          variant="secondary"
          className="w-auto"
          onClick={() => refetch()}
        >
          Tentar novamente
        </Button>
      </div>
    )
  }

  const items = data?.items ?? []
  const total = data?.total ?? 0

  if (items.length === 0) {
    return (
      <div className="flex flex-col items-center gap-4 py-10 text-center">
        <LinkIcon />
        <p className="text-xs font-semibold uppercase text-gray-500">
          Ainda não existem links cadastrados
        </p>
      </div>
    )
  }

  const hasPagination = total > LINKS_LIST_LIMIT
  const totalPages = Math.ceil(total / LINKS_LIST_LIMIT)

  return (
    <div className="flex flex-col">
      {items.map((link) => (
        <LinkListItem key={link.id} link={link} />
      ))}
      {hasPagination && (
        <div className="flex items-center justify-between pt-4">
          <Button
            variant="secondary"
            className="w-auto"
            disabled={page <= 1}
            onClick={() => setPage((current) => current - 1)}
          >
            Anterior
          </Button>
          <Button
            variant="secondary"
            className="w-auto"
            disabled={page >= totalPages}
            onClick={() => setPage((current) => current + 1)}
          >
            Próxima
          </Button>
        </div>
      )}
    </div>
  )
}

function LinkIcon() {
  return (
    <svg
      width="32"
      height="32"
      viewBox="0 0 24 24"
      fill="none"
      className="text-gray-400"
      aria-hidden="true"
    >
      <g stroke="currentColor" strokeWidth="2" strokeLinecap="round">
        <rect x="2" y="9" width="10" height="6" rx="3" transform="rotate(-45 7 12)" />
        <rect x="12" y="9" width="10" height="6" rx="3" transform="rotate(-45 17 12)" />
      </g>
    </svg>
  )
}
