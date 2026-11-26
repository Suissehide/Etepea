import type { FastifyPluginAsync } from 'fastify'
import { z } from 'zod/v4'

import {
  type CreateServiceRoleBody,
  createServiceRoleSchema,
  type ListServiceRolesQuery,
  listServiceRolesQuerySchema,
  type ServiceRoleParams,
  serviceRoleParamsSchema,
  serviceRoleResponseSchema,
  serviceRolesResponseSchema,
  type UpdateServiceRoleBody,
  updateServiceRoleSchema,
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

  fastify.post<{ Body: CreateServiceRoleBody }>(
    '/',
    {
      schema: {
        body: createServiceRoleSchema,
        response: { 201: serviceRoleResponseSchema },
      },
      config: { permission: 'roles:manage' },
    },
    async (request, reply) => {
      reply.code(201)
      return await serviceRoleDomain.create(request.body)
    },
  )

  fastify.patch<{ Params: ServiceRoleParams; Body: UpdateServiceRoleBody }>(
    '/:roleId',
    {
      schema: {
        params: serviceRoleParamsSchema,
        body: updateServiceRoleSchema,
        response: { 200: serviceRoleResponseSchema },
      },
      config: { permission: 'roles:manage' },
    },
    (request) => serviceRoleDomain.update(request.params.roleId, request.body),
  )

  fastify.delete<{ Params: ServiceRoleParams }>(
    '/:roleId',
    {
      schema: {
        params: serviceRoleParamsSchema,
        response: { 204: z.null() },
      },
      config: { permission: 'roles:manage' },
    },
    async (request, reply) => {
      await serviceRoleDomain.archive(request.params.roleId)
      reply.code(204).send()
    },
  )

  fastify.post<{ Params: ServiceRoleParams }>(
    '/:roleId/restore',
    {
      schema: {
        params: serviceRoleParamsSchema,
        response: { 200: serviceRoleResponseSchema },
      },
      config: { permission: 'roles:manage' },
    },
    (request) => serviceRoleDomain.restore(request.params.roleId),
  )

  return Promise.resolve()
}

export { serviceRoleRouter }
