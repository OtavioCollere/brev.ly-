import { IconButton } from '../../components/ui/IconButton'
import { useToast } from '../../components/Toast/useToast'
import { useDeleteLinkMutation } from '../../hooks/useLinksApi'
import type { Link } from '../../types'

interface LinkListItemProps {
  link: Link
}

export function LinkListItem({ link }: LinkListItemProps) {
  const { show } = useToast()
  const deleteLinkMutation = useDeleteLinkMutation()

  async function handleCopy() {
    await navigator.clipboard.writeText(`https://brev.ly/${link.shortUrl}`)
    show('Link copiado!', 'info')
  }

  function handleDelete() {
    deleteLinkMutation.mutate(link.id, {
      onError: () => {
        show('Erro ao deletar o link.', 'error')
      },
    })
  }

  return (
    <div className="flex items-center justify-between gap-4 border-b border-gray-200 py-3 last:border-b-0">
      <div className="flex min-w-0 flex-col gap-1">
        <button
          type="button"
          onClick={handleCopy}
          className="truncate text-left text-md font-semibold text-blue-base hover:underline"
        >
          brev.ly/{link.shortUrl}
        </button>
        <span className="truncate text-sm text-gray-500">{link.originalUrl}</span>
      </div>
      <div className="flex shrink-0 items-center gap-4">
        <span className="text-sm text-gray-500">{link.accessCount} acessos</span>
        <IconButton
          icon={<TrashIcon />}
          aria-label="Deletar link"
          onClick={handleDelete}
        />
      </div>
    </div>
  )
}

function TrashIcon() {
  return (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" aria-hidden="true">
      <path
        d="M4 7h16M9 7V5a2 2 0 0 1 2-2h2a2 2 0 0 1 2 2v2m-8 0 1 12a2 2 0 0 0 2 2h4a2 2 0 0 0 2-2l1-12"
        stroke="currentColor"
        strokeWidth="1.5"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  )
}
