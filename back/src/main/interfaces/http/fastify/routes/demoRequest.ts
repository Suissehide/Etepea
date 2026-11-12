import type { FastifyPluginAsync } from 'fastify'

import { demoRequestMail } from '../../../../infra/mail/templates'
import {
  type DemoRequestInput,
  demoRequestSchema,
} from '../schemas/demo-request.schema'

const DEMO_REQUEST_URL = '/demo-request'

// Formulaire du site vitrine : public, limité en débit, sans écriture en base.
const demoRequestRouter: FastifyPluginAsync = (fastify) => {
  const { mailer, config } = fastify.iocContainer

  fastify.post<{ Body: DemoRequestInput }>(
    '/',
    {
      schema: { body: demoRequestSchema },
      config: { rateLimit: { max: 5, timeWindow: '15 minutes' } },
    },
    async (request, reply) => {
      const { website, ...demo } = request.body
      if (!website) {
        mailer.send(
          'demande de démo',
          demoRequestMail(config.demoRequestTo, demo),
        )
      }
      return await reply.code(204).send()
    },
  )
  return Promise.resolve()
}

export { DEMO_REQUEST_URL, demoRequestRouter }
