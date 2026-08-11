import Fastify from 'fastify'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { registerErrorHandler } from '../../../plugins/error-handler'
import { exportRoutes } from '../export.routes'
import type * as exportService from '../export.service'

// export.routes imports the real export.service module for its default
// (non-injected) service, which in turn imports the DB client and R2 storage
// client and reads env vars at module load time. These tests always inject an
// explicit mock, so the real module is never used — mock it to avoid
// requiring a live environment/DB/R2 credentials just to load the route.
vi.mock('../export.service', () => ({
  exportLinksToCsv: vi.fn(),
}))

type ExportServiceMock = {
  [K in keyof typeof exportService]: (typeof exportService)[K] extends (
    ...args: infer A
  ) => infer R
    ? (...args: A) => R
    : (typeof exportService)[K]
}

function buildTestApp(exportServiceMock: ExportServiceMock) {
  const app = Fastify({ logger: false })
  registerErrorHandler(app)
  app.register(exportRoutes, { exportService: exportServiceMock })
  return app
}

describe('export.routes GET /links/export', () => {
  let exportServiceMock: ExportServiceMock

  beforeEach(() => {
    exportServiceMock = { exportLinksToCsv: vi.fn() }
  })

  it('returns 200 with the CSV url on success (CSV-01/CSV-02)', async () => {
    vi.mocked(exportServiceMock.exportLinksToCsv).mockResolvedValue({
      url: 'https://cdn.example.com/11111111-1111-1111-1111-111111111111.csv',
    })
    const app = buildTestApp(exportServiceMock)

    const response = await app.inject({ method: 'GET', url: '/links/export' })

    expect(response.statusCode).toBe(200)
    expect(response.json()).toEqual({
      url: 'https://cdn.example.com/11111111-1111-1111-1111-111111111111.csv',
    })
  })

  it('returns 5xx with a message and no url when the service fails (CSV-04)', async () => {
    vi.mocked(exportServiceMock.exportLinksToCsv).mockRejectedValue(
      new Error('upload failed')
    )
    const app = buildTestApp(exportServiceMock)

    const response = await app.inject({ method: 'GET', url: '/links/export' })

    expect(response.statusCode).toBeGreaterThanOrEqual(500)
    const body = response.json()
    expect(body).toHaveProperty('message')
    expect(body).not.toHaveProperty('url')
  })
})
