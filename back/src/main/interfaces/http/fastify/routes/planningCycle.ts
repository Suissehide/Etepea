import dayjs from 'dayjs'
import type { FastifyPluginAsync } from 'fastify'
import { z } from 'zod/v4'

import {
  planningCycleNullableResponseSchema,
  planningCycleResponseSchema,
  type SavePlanningCycleBody,
  savePlanningCycleBodySchema,
} from '../schemas/planningCycle.schema'

const planningCycleRouter: FastifyPluginAsync = (fastify) => {
  const { planningCycleDomain, appEventBus, tenantContext } =
    fastify.iocContainer
  // Un cycle par service : le service sert d'identifiant à sa ligne de journal.
  const emit = (
    action: 'updated' | 'deleted',
    userID: string,
    cycle: { startOfWeek: string; weekCount: number },
  ) =>
    appEventBus.emit(`planning.${action}`, {
      userID,
      entityType: 'planningCycle',
      entityID: tenantContext.current().serviceId ?? '',
      detail: `${cycle.weekCount} semaines à partir du ${dayjs(cycle.startOfWeek).format('DD/MM/YYYY')}`,
      ...(action === 'deleted' ? { restoreData: cycle } : {}),
    })

  // Lisible par tout membre du service : la numerotation des semaines
  // s'affiche pour tout le monde, seule sa configuration est reservee.
  fastify.get(
    '/',
    {
      schema: { response: { 200: planningCycleNullableResponseSchema } },
      config: { permission: 'planning:read' },
    },
    () => planningCycleDomain.find(),
  )

  // Enregistrer / mettre a jour
  fastify.put<{ Body: SavePlanningCycleBody }>(
    '/',
    {
      schema: {
        body: savePlanningCycleBodySchema,
        response: {
          200: planningCycleResponseSchema,
          403: z.object({ message: z.string() }),
        },
      },
      config: { permission: 'planning:write' },
    },
    async (request) => {
      const saved = await planningCycleDomain.save({
        startOfWeek: request.body.startOfWeek,
        weekCount: request.body.weekCount,
      })
      emit('updated', request.user.userID, {
        startOfWeek: saved.startOfWeek.toISOString().slice(0, 10),
        weekCount: saved.weekCount,
      })
      return saved
    },
  )

  // Reinitialiser : le planning repasse en numerotation ISO
  fastify.delete(
    '/',
    {
      schema: {
        response: {
          204: z.null(),
          403: z.object({ message: z.string() }),
        },
      },
      config: { permission: 'planning:write' },
    },
    async (request, reply) => {
      const deleted = await planningCycleDomain.delete()
      if (deleted) {
        emit('deleted', request.user.userID, deleted)
      }
      reply.code(204).send()
    },
  )

  return Promise.resolve()
}

export { planningCycleRouter }
