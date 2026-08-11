import { randomUUID } from 'node:crypto'
import { index, integer, pgTable, text, timestamp, uuid, varchar } from 'drizzle-orm/pg-core'

export const links = pgTable(
  'links',
  {
    id: uuid('id').primaryKey().$defaultFn(() => randomUUID()),
    originalUrl: text('original_url').notNull(),
    shortUrl: varchar('short_url', { length: 60 }).notNull().unique(),
    accessCount: integer('access_count').notNull().default(0),
    createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => ({
    createdAtIdx: index('links_created_at_idx').on(table.createdAt),
  })
)
