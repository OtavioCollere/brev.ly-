import Fastify from 'fastify'
import { exportRoutes } from './modules/export/export.routes'
import { linksRoutes } from './modules/links/links.routes'
import { registerCors } from './plugins/cors'
import { registerErrorHandler } from './plugins/error-handler'

export async function buildApp() {
  const app = Fastify({
    logger: true,
  })

  await registerCors(app)
  registerErrorHandler(app)

  await app.register(linksRoutes)
  await app.register(exportRoutes)

  return app
}
