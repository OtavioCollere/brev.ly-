import type { Link } from '../links/links.repository'

const CSV_HEADER = 'URL original,URL encurtada,Contagem de acessos,Data de criação'

function escapeField(value: string): string {
  if (value.includes(',') || value.includes('"') || value.includes('\n')) {
    return `"${value.replace(/"/g, '""')}"`
  }

  return value
}

function buildRow(link: Link): string {
  return [
    escapeField(link.originalUrl),
    escapeField(link.shortUrl),
    String(link.accessCount),
    link.createdAt.toISOString(),
  ].join(',')
}

export function buildLinksCsv(links: Link[]): string {
  return [CSV_HEADER, ...links.map(buildRow)].join('\n')
}
