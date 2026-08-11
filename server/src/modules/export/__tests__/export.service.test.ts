import { beforeEach, describe, expect, it, vi } from 'vitest'
import type { Link } from '../../links/links.repository'
import * as linksRepository from '../../links/links.repository'
import * as storage from '../../../storage/r2-client'
import { exportLinksToCsv } from '../export.service'

vi.mock('../../links/links.repository', () => ({
  create: vi.fn(),
  findAllPaginated: vi.fn(),
  deleteById: vi.fn(),
  resolveAndIncrementAccess: vi.fn(),
  findAll: vi.fn(),
}))

vi.mock('../../../storage/r2-client', () => ({
  uploadCsv: vi.fn(),
}))

const mockedRepository = vi.mocked(linksRepository)
const mockedStorage = vi.mocked(storage)

const links: Link[] = [
  {
    id: '11111111-1111-1111-1111-111111111111',
    originalUrl: 'https://example.com/a',
    shortUrl: 'a-link',
    accessCount: 3,
    createdAt: new Date('2026-01-02T00:00:00.000Z'),
  },
]

beforeEach(() => {
  vi.resetAllMocks()
})

describe('exportLinksToCsv', () => {
  it('builds the CSV from all links and uploads it, returning the url (CSV-01/CSV-02)', async () => {
    mockedRepository.findAll.mockResolvedValue(links)
    mockedStorage.uploadCsv.mockResolvedValue({
      key: '11111111-1111-1111-1111-111111111111.csv',
      url: 'https://cdn.example.com/11111111-1111-1111-1111-111111111111.csv',
    })

    const result = await exportLinksToCsv()

    expect(mockedRepository.findAll).toHaveBeenCalled()
    expect(mockedStorage.uploadCsv).toHaveBeenCalledWith(
      expect.stringContaining('https://example.com/a,a-link,3,2026-01-02T00:00:00.000Z')
    )
    expect(result).toEqual({
      url: 'https://cdn.example.com/11111111-1111-1111-1111-111111111111.csv',
    })
  })

  it('still generates and uploads a (header-only) CSV when there are no links, without error (CSV-03)', async () => {
    mockedRepository.findAll.mockResolvedValue([])
    mockedStorage.uploadCsv.mockResolvedValue({
      key: '22222222-2222-2222-2222-222222222222.csv',
      url: 'https://cdn.example.com/22222222-2222-2222-2222-222222222222.csv',
    })

    const result = await exportLinksToCsv()

    expect(mockedStorage.uploadCsv).toHaveBeenCalledWith(
      'URL original,URL encurtada,Contagem de acessos,Data de criação'
    )
    expect(result).toEqual({
      url: 'https://cdn.example.com/22222222-2222-2222-2222-222222222222.csv',
    })
  })

  it('propagates the error and does not return a url when the storage upload fails (CSV-04)', async () => {
    mockedRepository.findAll.mockResolvedValue(links)
    mockedStorage.uploadCsv.mockRejectedValue(new Error('upload failed'))

    await expect(exportLinksToCsv()).rejects.toThrow('upload failed')
  })
})
