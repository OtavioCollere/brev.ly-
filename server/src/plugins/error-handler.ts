import type { FastifyInstance } from 'fastify'
import {
  ConflictError,
  NotFoundError,
  ValidationError,
} from '../modules/links/links.errors'

const GENERIC_ERROR_MESSAGE = 'Internal server error'

export function registerErrorHandler(app: FastifyInstance) {
  app.setErrorHandler((error, request, reply) => {
    if (
      error instanceof ValidationError ||
      error instanceof ConflictError ||
      error instanceof NotFoundError
    ) {
      return reply.status(error.statusCode).send({ message: error.message })
    }

    request.log.error(error)

    return reply.status(500).send({ message: GENERIC_ERROR_MESSAGE })
  })
}
