import type { FastifyPluginAsync } from 'fastify'
import { z } from 'zod/v4'

const planningRestoreRouter: FastifyPluginAsync = (fastify) => {
  const { planningRestoreDomain } = fastify.iocContainer

  fastify.post<{ Params: { activityLogId: string } }>(
    '/:activityLogId',
    {
      schema: {
        params: z.object({ activityLogId: z.string().min(1) }),
        response: { 204: z.null() },
      },
      config: { permission: 'planning:write' },
    },
    async (request, reply) => {
      await planningRestoreDomain.restore(
        request.params.activityLogId,
        request.user.userID,
      )
      reply.code(204).send()
    },
  )

  return Promise.resolve()
}

export { planningRestoreRouter }
