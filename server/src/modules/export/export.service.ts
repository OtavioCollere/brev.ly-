import * as linksRepository from '../links/links.repository'
import * as storage from '../../storage/r2-client'
import { buildLinksCsv } from './csv'

export interface ExportLinksResult {
  url: string
}

export async function exportLinksToCsv(): Promise<ExportLinksResult> {
  const links = await linksRepository.findAll()
  const csv = buildLinksCsv(links)
  const { url } = await storage.uploadCsv(csv)

  return { url }
}
