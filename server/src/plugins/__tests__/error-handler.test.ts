import Fastify from 'fastify'
import { describe, expect, it } from 'vitest'
import {
  ConflictError,
  NotFoundError,
  ValidationError,
} from '../../modules/links/links.errors'
import { registerErrorHandler } from '../error-handler'

function buildTestApp() {
  const app = Fastify({ logger: false })
  registerErrorHandler(app)

  app.get('/validation-error', () => {
    throw new ValidationError('slug inválido')
  })

  app.get('/conflict-error', () => {
    throw new ConflictError('slug já existe')
  })

  app.get('/not-found-error', () => {
    throw new NotFoundError('link não encontrado')
  })

  app.get('/unknown-error', () => {
    throw new Error('internal db credential leaked in stack trace')
  })

  return app
}

describe('error-handler plugin', () => {
  it('maps ValidationError to 400 with { message }', async () => {
    const app = buildTestApp()

    const response = await app.inject({
      method: 'GET',
      url: '/validation-error',
    })

    expect(response.statusCode).toBe(400)
    expect(response.json()).toEqual({ message: 'slug inválido' })
  })

  it('maps ConflictError to 409 with { message }', async () => {
    const app = buildTestApp()

    const response = await app.inject({
      method: 'GET',
      url: '/conflict-error',
    })

    expect(response.statusCode).toBe(409)
    expect(response.json()).toEqual({ message: 'slug já existe' })
  })

  it('maps NotFoundError to 404 with { message }', async () => {
    const app = buildTestApp()

    const response = await app.inject({
      method: 'GET',
      url: '/not-found-error',
    })

    expect(response.statusCode).toBe(404)
    expect(response.json()).toEqual({ message: 'link não encontrado' })
  })

  it('maps an unknown Error to 500 with a generic message and no leaked detail', async () => {
    const app = buildTestApp()

    const response = await app.inject({
      method: 'GET',
      url: '/unknown-error',
    })

    expect(response.statusCode).toBe(500)
    expect(response.json()).toEqual({ message: 'Internal server error' })
    expect(response.body).not.toContain('internal db credential')
    expect(response.body).not.toContain('stack')
  })
})
