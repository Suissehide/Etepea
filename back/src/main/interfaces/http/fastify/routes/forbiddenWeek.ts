import dayjs from 'dayjs'
import type { FastifyPluginAsync } from 'fastify'
import { z } from 'zod/v4'

import {
  type CreateForbiddenWeekBody,
  createForbiddenWeekBodySchema,
  type DeleteForbiddenWeekParams,
  deleteForbiddenWeekParamsSchema,
  forbiddenWeekResponseSchema,
  forbiddenWeeksResponseSchema,
} from '../schemas/forbiddenWeek.schema'

const semaine = (date: Date | string) =>
  `semaine du ${dayjs(date).format('DD/MM/YYYY')}`

const forbiddenWeekRouter: FastifyPluginAsync = (fastify) => {
  const { forbiddenWeekDomain, appEventBus } = fastify.iocContainer

  // Lisible par tout membre du service (affichage des semaines interdites
  // dans le calendrier) ; l'ecriture demande planning:write.
  // Get all
  fastify.get(
    '/',
    {
      schema: { response: { 200: forbiddenWeeksResponseSchema } },
      config: { permission: 'planning:read' },
    },
    () => forbiddenWeekDomain.findAll(),
  )

  // Create
  fastify.post<{ Body: CreateForbiddenWeekBody }>(
    '/',
    {
      schema: {
        body: createForbiddenWeekBodySchema,
        response: {
          201: forbiddenWeekResponseSchema,
          403: z.object({ message: z.string() }),
        },
      },
      config: { permission: 'planning:write' },
    },
    async (request, reply) => {
      const forbiddenWeek = await forbiddenWeekDomain.create(request.body.date)
      appEventBus.emit('planning.created', {
        userID: request.user.userID,
        entityType: 'forbiddenWeek',
        entityID: forbiddenWeek.id,
        detail: semaine(forbiddenWeek.startOfWeek),
      })
      reply.code(201)
      return forbiddenWeek
    },
  )

  // Delete
  fastify.delete<{ Params: DeleteForbiddenWeekParams }>(
    '/:id',
    {
      schema: {
        params: deleteForbiddenWeekParamsSchema,
        response: {
          204: z.null(),
          403: z.object({ message: z.string() }),
        },
      },
      config: { permission: 'planning:write' },
    },
    async (request, reply) => {
      const restoreData = await forbiddenWeekDomain.delete(request.params.id)
      appEventBus.emit('planning.deleted', {
        userID: request.user.userID,
        entityType: 'forbiddenWeek',
        entityID: request.params.id,
        restoreData,
        detail: semaine(restoreData.startOfWeek),
      })
      reply.code(204).send()
    },
  )

  return Promise.resolve()
}

export { forbiddenWeekRouter }
