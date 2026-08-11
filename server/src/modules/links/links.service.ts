import { ConflictError, NotFoundError, ValidationError } from './links.errors'
import type { Link } from './links.repository'
import * as linksRepository from './links.repository'

const SHORT_URL_PATTERN = /^[a-zA-Z0-9-_]{1,60}$/
const MAX_ORIGINAL_URL_LENGTH = 2048
const POSTGRES_UNIQUE_VIOLATION_CODE = '23505'

function isPostgresUniqueViolation(error: unknown): boolean {
  return (
    typeof error === 'object' &&
    error !== null &&
    'code' in error &&
    (error as { code?: unknown }).code === POSTGRES_UNIQUE_VIOLATION_CODE
  )
}

function validateShortUrl(shortUrl: string): void {
  if (!SHORT_URL_PATTERN.test(shortUrl)) {
    throw new ValidationError(
      'shortUrl deve conter apenas letras, números, "-" ou "_", com 1 a 60 caracteres'
    )
  }
}

function validateOriginalUrl(originalUrl: string): void {
  if (originalUrl.length > MAX_ORIGINAL_URL_LENGTH) {
    throw new ValidationError(
      `originalUrl não pode ter mais que ${MAX_ORIGINAL_URL_LENGTH} caracteres`
    )
  }

  let parsed: URL

  try {
    parsed = new URL(originalUrl)
  } catch {
    throw new ValidationError('originalUrl deve ser uma URL absoluta válida (http:// ou https://)')
  }

  if (parsed.protocol !== 'http:' && parsed.protocol !== 'https:') {
    throw new ValidationError('originalUrl deve ser uma URL absoluta válida (http:// ou https://)')
  }
}

export interface CreateLinkInput {
  originalUrl: string
  shortUrl: string
}

export async function createLink(input: CreateLinkInput): Promise<Link> {
  validateShortUrl(input.shortUrl)
  validateOriginalUrl(input.originalUrl)

  try {
    return await linksRepository.create(input)
  } catch (error) {
    if (isPostgresUniqueViolation(error)) {
      throw new ConflictError(`shortUrl "${input.shortUrl}" já está em uso`)
    }

    throw error
  }
}

export interface ListLinksResult {
  items: Link[]
  page: number
  limit: number
  total: number
}

export async function listLinks(page: number, limit: number): Promise<ListLinksResult> {
  const { items, total } = await linksRepository.findAllPaginated(page, limit)
  return { items, page, limit, total }
}

export async function deleteLink(id: string): Promise<void> {
  const deleted = await linksRepository.deleteById(id)

  if (!deleted) {
    throw new NotFoundError(`Link com id "${id}" não encontrado`)
  }
}

export async function resolveLink(shortUrl: string): Promise<Link> {
  const resolved = await linksRepository.resolveAndIncrementAccess(shortUrl)

  if (!resolved) {
    throw new NotFoundError(`Link com shortUrl "${shortUrl}" não encontrado`)
  }

  return resolved
}
