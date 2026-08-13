export interface Link {
  id: string
  originalUrl: string
  shortUrl: string
  accessCount: number
  createdAt: string
}

export interface PaginatedLinks {
  items: Link[]
  page: number
  limit: number
  total: number
}
