import type { FastifyPluginAsync } from 'fastify'

import {
  type ListServiceRolesQuery,
  listServiceRolesQuerySchema,
  serviceRolesResponseSchema,
} from '../schemas/serviceRole.schema'

// Sous le préfixe de service : /e/:establishmentId/s/:serviceId/roles.
const serviceRoleRouter: FastifyPluginAsync = (fastify) => {
  const { serviceRoleDomain } = fastify.iocContainer

  fastify.get<{ Querystring: ListServiceRolesQuery }>(
    '/',
    {
      schema: {
        querystring: listServiceRolesQuerySchema,
        response: { 200: serviceRolesResponseSchema },
      },
      config: { permission: 'members:read' },
    },
    (request) => serviceRoleDomain.findAll(request.query.archived),
  )

  return Promise.resolve()
}

export { serviceRoleRouter }
