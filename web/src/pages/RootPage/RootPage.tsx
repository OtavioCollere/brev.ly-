import { Logo } from '../../components/ui/Logo'
import { useLinksQuery } from '../../hooks/useLinksApi'
import { ExportCsvButton } from './ExportCsvButton'
import { LinksList, LINKS_LIST_LIMIT } from './LinksList'
import { NewLinkForm } from './NewLinkForm'

export function RootPage() {
  const { data } = useLinksQuery(1, LINKS_LIST_LIMIT)
  const linksCount = data?.total ?? 0

  return (
    <div className="mx-auto flex max-w-5xl flex-col gap-8 px-4 py-10 md:py-16">
      <header>
        <Logo />
      </header>

      <div className="flex flex-col gap-4 md:flex-row md:items-start">
        <section className="rounded-lg bg-white p-6 md:w-2/5">
          <NewLinkForm />
        </section>

        <section className="flex flex-col gap-4 rounded-lg bg-white p-6 md:w-3/5">
          <div className="flex items-center justify-between gap-4">
            <h2 className="text-lg font-bold text-gray-600">Meus links</h2>
            <ExportCsvButton linksCount={linksCount} />
          </div>
          <LinksList />
        </section>
      </div>
    </div>
  )
}
