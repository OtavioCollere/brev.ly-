import { describe, expect, it } from 'vitest'
import type { Link } from '../../links/links.repository'
import { buildLinksCsv } from '../csv'

const HEADER = 'URL original,URL encurtada,Contagem de acessos,Data de criação'

function buildLink(overrides: Partial<Link> = {}): Link {
  return {
    id: '11111111-1111-1111-1111-111111111111',
    originalUrl: 'https://example.com/a',
    shortUrl: 'a-link',
    accessCount: 3,
    createdAt: new Date('2026-01-02T00:00:00.000Z'),
    ...overrides,
  }
}

describe('buildLinksCsv', () => {
  it('builds a CSV with the header and one row per link (CSV-01)', () => {
    const links = [
      buildLink(),
      buildLink({
        id: '22222222-2222-2222-2222-222222222222',
        originalUrl: 'https://example.com/b',
        shortUrl: 'b-link',
        accessCount: 0,
        createdAt: new Date('2026-01-01T00:00:00.000Z'),
      }),
    ]

    const csv = buildLinksCsv(links)

    expect(csv).toBe(
      [
        HEADER,
        'https://example.com/a,a-link,3,2026-01-02T00:00:00.000Z',
        'https://example.com/b,b-link,0,2026-01-01T00:00:00.000Z',
      ].join('\n')
    )
  })

  it('returns only the header when the list is empty (CSV-03)', () => {
    const csv = buildLinksCsv([])

    expect(csv).toBe(HEADER)
  })

  it('escapes fields containing a comma, a double quote, or a newline (RFC 4180)', () => {
    const linkWithComma = buildLink({ originalUrl: 'https://example.com/a,b' })
    const linkWithQuote = buildLink({ originalUrl: 'https://example.com/"quoted"' })
    const linkWithNewline = buildLink({ originalUrl: 'https://example.com/a\nb' })

    expect(buildLinksCsv([linkWithComma])).toContain('"https://example.com/a,b"')
    expect(buildLinksCsv([linkWithQuote])).toContain(
      '"https://example.com/""quoted"""'
    )
    expect(buildLinksCsv([linkWithNewline])).toContain('"https://example.com/a\nb"')
  })
})
