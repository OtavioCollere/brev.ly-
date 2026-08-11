import { beforeEach, describe, expect, it, vi } from 'vitest'

const { sendMock } = vi.hoisted(() => ({ sendMock: vi.fn() }))

vi.mock('@aws-sdk/client-s3', () => ({
  S3Client: class {
    send = sendMock
  },
  // PutObjectCommand's constructor input is what we assert `send` was called
  // with — returning the raw input lets the test inspect the exact Bucket/
  // Key/Body/ContentType passed, without needing a separate spy.
  PutObjectCommand: class {
    constructor(input: unknown) {
      return input as never
    }
  },
}))

vi.mock('../../env', () => ({
  env: {
    PORT: 3333,
    DATABASE_URL: 'postgres://test',
    CLOUDFLARE_ACCOUNT_ID: 'test-account',
    CLOUDFLARE_ACCESS_KEY_ID: 'test-access-key',
    CLOUDFLARE_SECRET_ACCESS_KEY: 'test-secret-key',
    CLOUDFLARE_BUCKET: 'test-bucket',
    CLOUDFLARE_PUBLIC_URL: 'https://cdn.example.com',
  },
}))

import { uploadCsv } from '../r2-client'

const UUID_CSV_KEY_PATTERN =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}\.csv$/i

beforeEach(() => {
  vi.clearAllMocks()
})

describe('uploadCsv', () => {
  it('uploads with the correct Bucket/Key/Body/ContentType and returns the public URL (CSV-02)', async () => {
    sendMock.mockResolvedValue({})

    const result = await uploadCsv('a,b,c')

    expect(sendMock).toHaveBeenCalledWith({
      Bucket: 'test-bucket',
      Key: expect.stringMatching(UUID_CSV_KEY_PATTERN),
      Body: 'a,b,c',
      ContentType: 'text/csv',
    })
    expect(result.key).toMatch(UUID_CSV_KEY_PATTERN)
    expect(result.url).toBe(`https://cdn.example.com/${result.key}`)
  })

  it('propagates the error when the SDK upload fails, without returning a url (CSV-04)', async () => {
    sendMock.mockRejectedValue(new Error('network error'))

    await expect(uploadCsv('a,b,c')).rejects.toThrow('network error')
  })
})
