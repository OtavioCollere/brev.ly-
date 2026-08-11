import { desc, eq, sql } from 'drizzle-orm'
import { db } from '../../db/client'
import { links } from '../../db/schema'

export type Link = typeof links.$inferSelect

export async function create(data: { originalUrl: string; shortUrl: string }): Promise<Link> {
  const [link] = await db.insert(links).values(data).returning()
  return link
}

export async function findAllPaginated(
  page: number,
  limit: number
): Promise<{ items: Link[]; total: number }> {
  const offset = (page - 1) * limit

  const [items, totalResult] = await Promise.all([
    db.select().from(links).orderBy(desc(links.createdAt)).limit(limit).offset(offset),
    db.select({ total: sql<number>`count(*)::int` }).from(links),
  ])

  return { items, total: totalResult[0].total }
}

export async function deleteById(id: string): Promise<Link | undefined> {
  const [deleted] = await db.delete(links).where(eq(links.id, id)).returning()
  return deleted
}

export async function resolveAndIncrementAccess(shortUrl: string): Promise<Link | undefined> {
  const [updated] = await db
    .update(links)
    .set({ accessCount: sql`${links.accessCount} + 1` })
    .where(eq(links.shortUrl, shortUrl))
    .returning()
  return updated
}

export async function findAll(): Promise<Link[]> {
  return db.select().from(links).orderBy(desc(links.createdAt))
}
