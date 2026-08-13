import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import {
  ApiError,
  createLink,
  deleteLink,
  exportLinks,
  listLinks,
  resolveLink,
} from '../api-client'

const BASE_URL = 'http://localhost:3333'

function jsonResponse(body: unknown, status = 200): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { 'Content-Type': 'application/json' },
  })
}

describe('api-client', () => {
  beforeEach(() => {
    vi.stubGlobal('fetch', vi.fn())
  })

  afterEach(() => {
    vi.unstubAllGlobals()
  })

  it('createLink calls POST /links with the correct URL, method and body, and returns the created link', async () => {
    const link = {
      id: '1',
      originalUrl: 'https://example.com',
      shortUrl: 'abc',
      accessCount: 0,
      createdAt: '2026-08-10T00:00:00.000Z',
    }
    vi.mocked(fetch).mockResolvedValueOnce(jsonResponse(link, 201))

    const result = await createLink({
      originalUrl: 'https://example.com',
      shortUrl: 'abc',
    })

    expect(fetch).toHaveBeenCalledWith(`${BASE_URL}/links`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        originalUrl: 'https://example.com',
        shortUrl: 'abc',
      }),
    })
    expect(result).toEqual(link)
  })

  it('listLinks calls GET /links?page=&limit= with the correct URL and method, and returns the paginated response', async () => {
    const paginated = { items: [], page: 2, limit: 10, total: 0 }
    vi.mocked(fetch).mockResolvedValueOnce(jsonResponse(paginated))

    const result = await listLinks(2, 10)

    expect(fetch).toHaveBeenCalledWith(`${BASE_URL}/links?page=2&limit=10`, {
      method: 'GET',
    })
    expect(result).toEqual(paginated)
  })

  it('deleteLink calls DELETE /links/:id with the correct URL and method, and resolves without a body', async () => {
    vi.mocked(fetch).mockResolvedValueOnce(new Response(null, { status: 204 }))

    const result = await deleteLink('link-id')

    expect(fetch).toHaveBeenCalledWith(`${BASE_URL}/links/link-id`, {
      method: 'DELETE',
    })
    expect(result).toBeUndefined()
  })

  it('resolveLink calls GET /links/:shortUrl with the correct URL and method, and returns the original URL', async () => {
    vi.mocked(fetch).mockResolvedValueOnce(
      jsonResponse({ originalUrl: 'https://example.com' })
    )

    const result = await resolveLink('abc')

    expect(fetch).toHaveBeenCalledWith(`${BASE_URL}/links/abc`, {
      method: 'GET',
    })
    expect(result).toEqual({ originalUrl: 'https://example.com' })
  })

  it('exportLinks calls GET /links/export with the correct URL and method, and returns the CSV URL', async () => {
    vi.mocked(fetch).mockResolvedValueOnce(
      jsonResponse({ url: 'https://cdn.example.com/links.csv' })
    )

    const result = await exportLinks()

    expect(fetch).toHaveBeenCalledWith(`${BASE_URL}/links/export`, {
      method: 'GET',
    })
    expect(result).toEqual({ url: 'https://cdn.example.com/links.csv' })
  })

  it('maps a non-2xx response body {message} to an ApiError with the matching status and message', async () => {
    vi.mocked(fetch).mockResolvedValueOnce(
      jsonResponse({ message: 'shortUrl já está em uso.' }, 409)
    )

    const promise = createLink({
      originalUrl: 'https://example.com',
      shortUrl: 'abc',
    })

    await expect(promise).rejects.toBeInstanceOf(ApiError)
    await expect(promise).rejects.toMatchObject({
      status: 409,
      message: 'shortUrl já está em uso.',
    })
  })
})
