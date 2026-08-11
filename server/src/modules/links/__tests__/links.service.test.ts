import { beforeEach, describe, expect, it, vi } from 'vitest'
import { ConflictError, NotFoundError, ValidationError } from '../links.errors'
import * as linksRepository from '../links.repository'
import { createLink, deleteLink, listLinks, resolveLink } from '../links.service'

vi.mock('../links.repository', () => ({
  create: vi.fn(),
  findAllPaginated: vi.fn(),
  deleteById: vi.fn(),
  resolveAndIncrementAccess: vi.fn(),
  findAll: vi.fn(),
}))

const mockedRepository = vi.mocked(linksRepository)

beforeEach(() => {
  vi.resetAllMocks()
})

describe('links.service createLink', () => {
  it('creates a link when shortUrl and originalUrl are valid (URL-01)', async () => {
    const input = { originalUrl: 'https://example.com/some/page', shortUrl: 'my-link' }
    const created = {
      id: '11111111-1111-1111-1111-111111111111',
      originalUrl: input.originalUrl,
      shortUrl: input.shortUrl,
      accessCount: 0,
      createdAt: new Date('2026-01-01T00:00:00Z'),
    }
    mockedRepository.create.mockResolvedValue(created)

    const result = await createLink(input)

    expect(result).toEqual(created)
    expect(mockedRepository.create).toHaveBeenCalledWith(input)
  })

  it.each([
    ['empty string', ''],
    ['contains a space', 'my link'],
    ['contains a slash', 'my/link'],
  ])('rejects shortUrl that is malformed: %s (URL-02)', async (_label, shortUrl) => {
    await expect(
      createLink({ originalUrl: 'https://example.com', shortUrl })
    ).rejects.toBeInstanceOf(ValidationError)
    expect(mockedRepository.create).not.toHaveBeenCalled()
  })

  it('rejects originalUrl without a protocol (URL-03)', async () => {
    await expect(
      createLink({ originalUrl: 'www.example.com', shortUrl: 'valid-slug' })
    ).rejects.toBeInstanceOf(ValidationError)
    expect(mockedRepository.create).not.toHaveBeenCalled()
  })

  it('rejects originalUrl longer than 2048 characters (URL-03)', async () => {
    const longUrl = `https://example.com/${'a'.repeat(2048)}`
    expect(longUrl.length).toBeGreaterThan(2048)

    await expect(
      createLink({ originalUrl: longUrl, shortUrl: 'valid-slug' })
    ).rejects.toBeInstanceOf(ValidationError)
    expect(mockedRepository.create).not.toHaveBeenCalled()
  })

  it('translates a Postgres unique-violation (23505) into a ConflictError (URL-04)', async () => {
    const uniqueViolation = Object.assign(new Error('duplicate key value'), {
      code: '23505',
    })
    mockedRepository.create.mockRejectedValue(uniqueViolation)

    await expect(
      createLink({ originalUrl: 'https://example.com', shortUrl: 'taken-slug' })
    ).rejects.toBeInstanceOf(ConflictError)
  })
})

describe('links.service listLinks', () => {
  it('returns the paginated items and total from the repository (URL-05)', async () => {
    const items = [
      {
        id: '11111111-1111-1111-1111-111111111111',
        originalUrl: 'https://example.com/a',
        shortUrl: 'a-link',
        accessCount: 3,
        createdAt: new Date('2026-01-02T00:00:00Z'),
      },
      {
        id: '22222222-2222-2222-2222-222222222222',
        originalUrl: 'https://example.com/b',
        shortUrl: 'b-link',
        accessCount: 0,
        createdAt: new Date('2026-01-01T00:00:00Z'),
      },
    ]
    mockedRepository.findAllPaginated.mockResolvedValue({ items, total: 2 })

    const result = await listLinks(1, 10)

    expect(result).toEqual({ items, page: 1, limit: 10, total: 2 })
    expect(mockedRepository.findAllPaginated).toHaveBeenCalledWith(1, 10)
  })

  it('returns an empty list without error when there are no links (URL-06)', async () => {
    mockedRepository.findAllPaginated.mockResolvedValue({ items: [], total: 0 })

    const result = await listLinks(1, 10)

    expect(result).toEqual({ items: [], page: 1, limit: 10, total: 0 })
  })
})

describe('links.service deleteLink', () => {
  it('deletes an existing link by id (DEL-01)', async () => {
    const id = '11111111-1111-1111-1111-111111111111'
    mockedRepository.deleteById.mockResolvedValue({
      id,
      originalUrl: 'https://example.com',
      shortUrl: 'a-link',
      accessCount: 0,
      createdAt: new Date('2026-01-01T00:00:00Z'),
    })

    await expect(deleteLink(id)).resolves.toBeUndefined()
    expect(mockedRepository.deleteById).toHaveBeenCalledWith(id)
  })

  it('throws NotFoundError when the id does not exist (DEL-02)', async () => {
    mockedRepository.deleteById.mockResolvedValue(undefined)

    await expect(deleteLink('nonexistent-id')).rejects.toBeInstanceOf(NotFoundError)
  })
})

describe('links.service resolveLink', () => {
  it('returns the link with the incremented access count for an existing shortUrl (URL-07)', async () => {
    const resolved = {
      id: '11111111-1111-1111-1111-111111111111',
      originalUrl: 'https://example.com',
      shortUrl: 'a-link',
      accessCount: 6,
      createdAt: new Date('2026-01-01T00:00:00Z'),
    }
    mockedRepository.resolveAndIncrementAccess.mockResolvedValue(resolved)

    const result = await resolveLink('a-link')

    expect(result).toEqual(resolved)
    expect(result.accessCount).toBe(6)
    expect(mockedRepository.resolveAndIncrementAccess).toHaveBeenCalledWith('a-link')
  })

  it('throws NotFoundError when the shortUrl does not exist (URL-08)', async () => {
    mockedRepository.resolveAndIncrementAccess.mockResolvedValue(undefined)

    await expect(resolveLink('nonexistent-slug')).rejects.toBeInstanceOf(NotFoundError)
  })
})
