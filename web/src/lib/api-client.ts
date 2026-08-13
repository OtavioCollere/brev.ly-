import { env } from '../env'
import type { Link, PaginatedLinks } from '../types'

const BASE_URL = env.VITE_BACKEND_URL

export class ApiError extends Error {
  status: number

  constructor(message: string, status: number) {
    super(message)
    this.name = 'ApiError'
    this.status = status
  }
}

async function handleResponse<T>(response: Response): Promise<T> {
  if (!response.ok) {
    const body = await response
      .json()
      .catch(() => ({ message: 'Erro inesperado.' }))
    throw new ApiError(body.message ?? 'Erro inesperado.', response.status)
  }

  if (response.status === 204) {
    return undefined as T
  }

  return response.json() as Promise<T>
}

async function request<T>(path: string, init?: RequestInit): Promise<T> {
  let response: Response

  try {
    response = await fetch(`${BASE_URL}${path}`, init)
  } catch {
    throw new ApiError('Não foi possível conectar ao servidor.', 0)
  }

  return handleResponse<T>(response)
}

export function createLink(input: {
  originalUrl: string
  shortUrl: string
}): Promise<Link> {
  return request<Link>('/links', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(input),
  })
}

export function listLinks(page: number, limit: number): Promise<PaginatedLinks> {
  const params = new URLSearchParams({
    page: String(page),
    limit: String(limit),
  })

  return request<PaginatedLinks>(`/links?${params.toString()}`, {
    method: 'GET',
  })
}

export function deleteLink(id: string): Promise<void> {
  return request<void>(`/links/${id}`, { method: 'DELETE' })
}

export function resolveLink(shortUrl: string): Promise<{ originalUrl: string }> {
  return request<{ originalUrl: string }>(`/links/${shortUrl}`, {
    method: 'GET',
  })
}

export function exportLinks(): Promise<{ url: string }> {
  return request<{ url: string }>('/links/export', { method: 'GET' })
}
