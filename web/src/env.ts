import { z } from 'zod'

const envSchema = z.object({
  VITE_FRONTEND_URL: z.string(),
  VITE_BACKEND_URL: z.string(),
})

const parsed = envSchema.safeParse(import.meta.env)

if (!parsed.success) {
  throw new Error(
    `Invalid environment variables: ${JSON.stringify(z.treeifyError(parsed.error))}`
  )
}

export const env = parsed.data
