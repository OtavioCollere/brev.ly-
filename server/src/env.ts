import { z } from 'zod'

const envSchema = z.object({
  PORT: z.coerce.number(),
  DATABASE_URL: z.string(),
  CLOUDFLARE_ACCOUNT_ID: z.string(),
  CLOUDFLARE_ACCESS_KEY_ID: z.string(),
  CLOUDFLARE_SECRET_ACCESS_KEY: z.string(),
  CLOUDFLARE_BUCKET: z.string(),
  CLOUDFLARE_PUBLIC_URL: z.string(),
})

const parsed = envSchema.safeParse(process.env)

if (!parsed.success) {
  throw new Error(
    `Invalid environment variables: ${JSON.stringify(z.treeifyError(parsed.error))}`
  )
}

export const env = parsed.data
