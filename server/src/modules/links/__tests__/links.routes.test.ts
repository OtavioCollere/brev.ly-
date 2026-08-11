import Fastify from 'fastify'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { registerErrorHandler } from '../../../plugins/error-handler'
import { ConflictError, NotFoundError, ValidationError } from '../links.errors'
import { linksRoutes } from '../links.routes'
import type * as linksService from '../links.service'

// links.routes imports the real links.service module for its default (non-injected)
// service, which in turn imports the DB client and reads env vars at module load
// time. These tests always inject an explicit mock, so the real module is never
// used — mock it to avoid requiring a live environment/DB just to load the route.
vi.mock('../links.service', () => ({
  createLink: vi.fn(),
  listLinks: vi.fn(),
  deleteLink: vi.fn(),
  resolveLink: vi.fn(),
}))

type LinksServiceMock = {
  [K in keyof typeof linksService]: (typeof linksService)[K] extends (
    ...args: infer A
  ) => infer R
    ? (...args: A) => R
    : (typeof linksService)[K]
}

function buildTestApp(linksServiceMock: Partial<LinksServiceMock>) {
  const app = Fastify({ logger: false })
  registerErrorHandler(app)
  app.register(linksRoutes, { linksService: linksServiceMock as LinksServiceMock })
  return app
}

function createServiceMock(): LinksServiceMock {
  return {
    createLink: vi.fn(),
    listLinks: vi.fn(),
    deleteLink: vi.fn(),
    resolveLink: vi.fn(),
  }
}

describe('links.routes POST /links', () => {
  let linksServiceMock: LinksServiceMock

  beforeEach(() => {
    linksServiceMock = createServiceMock()
  })

  it('returns 201 with the created link on a valid payload (URL-01)', async () => {
    const created = {
      id: '11111111-1111-1111-1111-111111111111',
      originalUrl: 'https://example.com',
      shortUrl: 'my-link',
      accessCount: 0,
      createdAt: '2026-01-01T00:00:00.000Z',
    }
    vi.mocked(linksServiceMock.createLink).mockResolvedValue(created as never)
    const app = buildTestApp(linksServiceMock)

    const response = await app.inject({
      method: 'POST',
      url: '/links',
      payload: { originalUrl: 'https://example.com', shortUrl: 'my-link' },
    })

    expect(response.statusCode).toBe(201)
    expect(response.json()).toEqual(created)
    expect(linksServiceMock.createLink).toHaveBeenCalledWith({
      originalUrl: 'https://example.com',
      shortUrl: 'my-link',
    })
  })

  it('returns 400 when the service rejects a malformed shortUrl (URL-02)', async () => {
    vi.mocked(linksServiceMock.createLink).mockRejectedValue(
      new ValidationError('shortUrl mal formatado')
    )
    const app = buildTestApp(linksServiceMock)

    const response = await app.inject({
      method: 'POST',
      url: '/links',
      payload: { originalUrl: 'https://example.com', shortUrl: 'in valid' },
    })

    expect(response.statusCode).toBe(400)
    expect(response.json()).toEqual({ message: 'shortUrl mal formatado' })
  })

  it('returns 400 when the service rejects a malformed originalUrl (URL-03)', async () => {
    vi.mocked(linksServiceMock.createLink).mockRejectedValue(
      new ValidationError('originalUrl mal formatada')
    )
    const app = buildTestApp(linksServiceMock)

    const response = await app.inject({
      method: 'POST',
      url: '/links',
      payload: { originalUrl: 'not-a-url', shortUrl: 'valid-slug' },
    })

    expect(response.statusCode).toBe(400)
    expect(response.json()).toEqual({ message: 'originalUrl mal formatada' })
  })

  it('returns 409 when the service reports a duplicate shortUrl (URL-04)', async () => {
    vi.mocked(linksServiceMock.createLink).mockRejectedValue(
      new ConflictError('shortUrl já está em uso')
    )
    const app = buildTestApp(linksServiceMock)

    const response = await app.inject({
      method: 'POST',
      url: '/links',
      payload: { originalUrl: 'https://example.com', shortUrl: 'taken-slug' },
    })

    expect(response.statusCode).toBe(409)
    expect(response.json()).toEqual({ message: 'shortUrl já está em uso' })
  })
})

describe('links.routes GET /links', () => {
  let linksServiceMock: LinksServiceMock

  beforeEach(() => {
    linksServiceMock = createServiceMock()
  })

  it('returns 200 with the paginated list when links exist (URL-05)', async () => {
    const listResult = {
      items: [
        {
          id: '11111111-1111-1111-1111-111111111111',
          originalUrl: 'https://example.com/a',
          shortUrl: 'a-link',
          accessCount: 3,
          createdAt: '2026-01-02T00:00:00.000Z',
        },
      ],
      page: 1,
      limit: 10,
      total: 1,
    }
    vi.mocked(linksServiceMock.listLinks).mockResolvedValue(listResult as never)
    const app = buildTestApp(linksServiceMock)

    const response = await app.inject({ method: 'GET', url: '/links' })

    expect(response.statusCode).toBe(200)
    expect(response.json()).toEqual(listResult)
    expect(linksServiceMock.listLinks).toHaveBeenCalledWith(1, 10)
  })

  it('returns 200 with an empty list when there are no links (URL-06)', async () => {
    const listResult = { items: [], page: 1, limit: 10, total: 0 }
    vi.mocked(linksServiceMock.listLinks).mockResolvedValue(listResult as never)
    const app = buildTestApp(linksServiceMock)

    const response = await app.inject({ method: 'GET', url: '/links' })

    expect(response.statusCode).toBe(200)
    expect(response.json()).toEqual(listResult)
  })
})

describe('links.routes DELETE /links/:id', () => {
  let linksServiceMock: LinksServiceMock

  beforeEach(() => {
    linksServiceMock = createServiceMock()
  })

  it('returns 204 when the id exists (DEL-01)', async () => {
    vi.mocked(linksServiceMock.deleteLink).mockResolvedValue(undefined)
    const app = buildTestApp(linksServiceMock)

    const response = await app.inject({
      method: 'DELETE',
      url: '/links/11111111-1111-4111-8111-111111111111',
    })

    expect(response.statusCode).toBe(204)
    expect(response.body).toBe('')
    expect(linksServiceMock.deleteLink).toHaveBeenCalledWith(
      '11111111-1111-4111-8111-111111111111'
    )
  })

  it('returns 404 when the id does not exist (DEL-02)', async () => {
    vi.mocked(linksServiceMock.deleteLink).mockRejectedValue(
      new NotFoundError('link não encontrado')
    )
    const app = buildTestApp(linksServiceMock)

    const response = await app.inject({
      method: 'DELETE',
      url: '/links/22222222-2222-4222-8222-222222222222',
    })

    expect(response.statusCode).toBe(404)
    expect(response.json()).toEqual({ message: 'link não encontrado' })
  })

  it('returns 400 without calling the service when the id is not a valid UUID (spec.md edge case)', async () => {
    const app = buildTestApp(linksServiceMock)

    const response = await app.inject({
      method: 'DELETE',
      url: '/links/not-a-uuid',
    })

    expect(response.statusCode).toBe(400)
    expect(linksServiceMock.deleteLink).not.toHaveBeenCalled()
  })
})

describe('links.routes GET /links/:shortUrl', () => {
  let linksServiceMock: LinksServiceMock

  beforeEach(() => {
    linksServiceMock = createServiceMock()
  })

  it('returns 200 with originalUrl when the shortUrl exists (URL-07)', async () => {
    vi.mocked(linksServiceMock.resolveLink).mockResolvedValue({
      id: '11111111-1111-1111-1111-111111111111',
      originalUrl: 'https://example.com/target',
      shortUrl: 'a-link',
      accessCount: 4,
      createdAt: new Date('2026-01-01T00:00:00.000Z'),
    })
    const app = buildTestApp(linksServiceMock)

    const response = await app.inject({ method: 'GET', url: '/links/a-link' })

    expect(response.statusCode).toBe(200)
    expect(response.json()).toEqual({ originalUrl: 'https://example.com/target' })
    expect(linksServiceMock.resolveLink).toHaveBeenCalledWith('a-link')
  })

  it('returns 404 when the shortUrl does not exist (URL-08)', async () => {
    vi.mocked(linksServiceMock.resolveLink).mockRejectedValue(
      new NotFoundError('link não encontrado')
    )
    const app = buildTestApp(linksServiceMock)

    const response = await app.inject({ method: 'GET', url: '/links/nonexistent-slug' })

    expect(response.statusCode).toBe(404)
    expect(response.json()).toEqual({ message: 'link não encontrado' })
  })
})
