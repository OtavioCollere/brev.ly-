import type { FastifyPluginAsync } from 'fastify'
import * as defaultExportService from './export.service'

type ExportService = typeof defaultExportService

export interface ExportRoutesOptions {
  exportService?: ExportService
}

export const exportRoutes: FastifyPluginAsync<ExportRoutesOptions> = async (app, opts) => {
  const exportService = opts.exportService ?? defaultExportService

  app.get('/links/export', async () => {
    return exportService.exportLinksToCsv()
  })
}
