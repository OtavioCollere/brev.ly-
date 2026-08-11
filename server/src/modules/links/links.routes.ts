import type { FastifyPluginAsync } from 'fastify'
import { z } from 'zod'
import { ValidationError } from './links.errors'
import * as defaultLinksService from './links.service'

type LinksService = typeof defaultLinksService

export interface LinksRoutesOptions {
  linksService?: LinksService
}

function firstIssueMessage(error: z.ZodError): string {
  return error.issues[0]?.message ?? 'Payload inválido'
}

const createLinkBodySchema = z.object({
  originalUrl: z.string(),
  shortUrl: z.string(),
})

const listLinksQuerySchema = z.object({
  page: z.coerce.number().int().min(1).default(1),
  limit: z.coerce.number().int().min(1).default(10),
})

const idParamsSchema = z.object({
  id: z.string().uuid(),
})

const shortUrlParamsSchema = z.object({
  shortUrl: z.string(),
})

export const linksRoutes: FastifyPluginAsync<LinksRoutesOptions> = async (app, opts) => {
  const linksService = opts.linksService ?? defaultLinksService

  app.post('/links', async (request, reply) => {
    const parsed = createLinkBodySchema.safeParse(request.body)

    if (!parsed.success) {
      throw new ValidationError(firstIssueMessage(parsed.error))
    }

    const link = await linksService.createLink(parsed.data)

    return reply.status(201).send(link)
  })

  app.get('/links', async (request) => {
    const parsed = listLinksQuerySchema.safeParse(request.query)

    if (!parsed.success) {
      throw new ValidationError(firstIssueMessage(parsed.error))
    }

    const { page, limit } = parsed.data

    return linksService.listLinks(page, limit)
  })

  app.delete('/links/:id', async (request, reply) => {
    const parsed = idParamsSchema.safeParse(request.params)

    if (!parsed.success) {
      throw new ValidationError(firstIssueMessage(parsed.error))
    }

    await linksService.deleteLink(parsed.data.id)

    return reply.status(204).send()
  })

  app.get('/links/:shortUrl', async (request) => {
    const parsed = shortUrlParamsSchema.safeParse(request.params)

    if (!parsed.success) {
      throw new ValidationError(firstIssueMessage(parsed.error))
    }

    const link = await linksService.resolveLink(parsed.data.shortUrl)

    return { originalUrl: link.originalUrl }
  })
}
