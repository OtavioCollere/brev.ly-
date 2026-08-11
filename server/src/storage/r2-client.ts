import { randomUUID } from 'node:crypto'
import { PutObjectCommand, S3Client } from '@aws-sdk/client-s3'
import { env } from '../env'

const s3Client = new S3Client({
  endpoint: `https://${env.CLOUDFLARE_ACCOUNT_ID}.r2.cloudflarestorage.com`,
  region: 'auto',
  credentials: {
    accessKeyId: env.CLOUDFLARE_ACCESS_KEY_ID,
    secretAccessKey: env.CLOUDFLARE_SECRET_ACCESS_KEY,
  },
})

function buildPublicUrl(key: string): string {
  const base = env.CLOUDFLARE_PUBLIC_URL.replace(/\/+$/, '')
  return `${base}/${key}`
}

export async function uploadCsv(content: string): Promise<{ key: string; url: string }> {
  const key = `${randomUUID()}.csv`

  await s3Client.send(
    new PutObjectCommand({
      Bucket: env.CLOUDFLARE_BUCKET,
      Key: key,
      Body: content,
      ContentType: 'text/csv',
    })
  )

  return { key, url: buildPublicUrl(key) }
}
