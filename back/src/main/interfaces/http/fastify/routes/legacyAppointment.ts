import { timingSafeEqual } from 'node:crypto'
import Boom from '@hapi/boom'
import type { FastifyPluginAsync } from 'fastify'

import {
  type LegacyAppointmentBody,
  type LegacyAppointmentParams,
  type LegacyAppointmentPatch,
  legacyAppointmentBodySchema,
  legacyAppointmentParamsSchema,
  legacyAppointmentPatchSchema,
  legacyAppointmentResponseSchema,
  legacyAppointmentsResponseSchema,
} from '../schemas/legacyAppointment.schema'

const LEGACY_RDV_URL = '/legacy-appointments'

const sameToken = (given: string | undefined, expected: string): boolean => {
  const a = Buffer.from(given ?? '')
  const b = Buffer.from(expected)
  return a.length === b.length && timingSafeEqual(a, b)
}

// Appelée par l'ancienne app (serveur à serveur) : jeton partagé, service fixé par la config.
const legacyAppointmentIngestRouter: FastifyPluginAsync = (fastify) => {
  const { config, legacyAppointmentRepository } = fastify.iocContainer

  fastify.post<{ Body: LegacyAppointmentBody }>(
    '/',
    {
      schema: { body: legacyAppointmentBodySchema },
      config: { rateLimit: { max: 120, timeWindow: '1 minute' } },
    },
    async (request, reply) => {
      const {
        legacyRdvToken: token,
        legacyRdvEstablishmentId: establishmentId,
        legacyRdvServiceId: serviceId,
      } = config
      if (!(token && establishmentId && serviceId)) {
        throw Boom.notFound()
      }
      const header = request.headers['x-etepea-token']
      if (!sameToken(typeof header === 'string' ? header : undefined, token)) {
        throw Boom.unauthorized()
      }
      const { date, ...rest } = request.body
      const received = await legacyAppointmentRepository.receive(
        { establishmentId, serviceId },
        { ...rest, date: new Date(`${date}T00:00:00Z`) },
      )
      if (!received) {
        throw Boom.notFound()
      }
      return await reply.code(204).send()
    },
  )
  return Promise.resolve()
}

const legacyAppointmentRouter: FastifyPluginAsync = (fastify) => {
  const { legacyAppointmentRepository } = fastify.iocContainer

  fastify.addHook('preHandler', async () => {
    if (!(await legacyAppointmentRepository.isEnabled())) {
      throw Boom.notFound()
    }
  })

  fastify.get(
    '/',
    {
      schema: { response: { 200: legacyAppointmentsResponseSchema } },
      config: { permission: 'appointment:create' },
    },
    () => legacyAppointmentRepository.findAll(),
  )

  fastify.patch<{
    Params: LegacyAppointmentParams
    Body: LegacyAppointmentPatch
  }>(
    '/:id',
    {
      schema: {
        params: legacyAppointmentParamsSchema,
        body: legacyAppointmentPatchSchema,
        response: { 200: legacyAppointmentResponseSchema },
      },
      config: { permission: 'appointment:create' },
    },
    (request) =>
      legacyAppointmentRepository.setReported(
        request.params.id,
        request.body.reported,
      ),
  )
  return Promise.resolve()
}

export {
  LEGACY_RDV_URL,
  legacyAppointmentIngestRouter,
  legacyAppointmentRouter,
}
