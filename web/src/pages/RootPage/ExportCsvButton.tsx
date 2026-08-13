import { Button } from '../../components/ui/Button'
import { useToast } from '../../components/Toast/useToast'
import { useExportCsvMutation } from '../../hooks/useLinksApi'
import { navigateTo } from '../../lib/navigate'

interface ExportCsvButtonProps {
  linksCount: number
}

export function ExportCsvButton({ linksCount }: ExportCsvButtonProps) {
  const { show } = useToast()
  const exportCsvMutation = useExportCsvMutation()

  function handleClick() {
    exportCsvMutation.mutate(undefined, {
      onSuccess: (data) => {
        navigateTo(data.url)
      },
      onError: () => {
        show('Erro ao exportar CSV.', 'error')
      },
    })
  }

  return (
    <Button
      variant="secondary"
      className="w-auto"
      disabled={linksCount === 0 || exportCsvMutation.isPending}
      onClick={handleClick}
    >
      Baixar CSV
    </Button>
  )
}
