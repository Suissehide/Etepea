import Boom from '@hapi/boom'

import type { Prisma } from '../../../../generated/client'
import type { IocContainer } from '../../../types/application/ioc'
import type {
  ServiceRoleEntityRepo,
  ServiceRoleRepositoryInterface,
  ServiceRoleWriteEntityRepo,
} from '../../../types/infra/orm/repositories/serviceRole.repository.interface'
import type { TenantContextInterface } from '../../../types/utils/tenant-context'
import { parsePermissions } from '../../../utils/permissions'
import type { PostgresPrismaClient } from '../postgres-client'

const roleSelect = {
  id: true,
  name: true,
  preset: true,
  permissions: true,
  archivedAt: true,
  hiddenSoignants: {
    where: { soignant: { archivedAt: null } },
    select: { soignantId: true },
  },
} as const

class ServiceRoleRepository implements ServiceRoleRepositoryInterface {
  private readonly prisma: PostgresPrismaClient
  private readonly tenantContext: TenantContextInterface

  constructor({ postgresOrm, tenantContext }: IocContainer) {
    this.prisma = postgresOrm.prisma
    this.tenantContext = tenantContext
  }

  private async list(
    where: Prisma.ServiceRoleDefWhereInput,
  ): Promise<ServiceRoleEntityRepo[]> {
    const scope = this.tenantContext.scope()
    const [roles, affectations] = await Promise.all([
      this.prisma.serviceRoleDef.findMany({
        where: { ...where, ...scope },
        select: roleSelect,
        orderBy: { createdAt: 'asc' },
      }),
      this.prisma.serviceMembership.findMany({
        where: scope,
        select: { roleId: true },
      }),
    ])
    return roles.map(({ hiddenSoignants, permissions, ...role }) => ({
      ...role,
      permissions: [...parsePermissions(permissions)],
      hiddenSoignantIds: hiddenSoignants.map((h) => h.soignantId),
      memberCount: affectations.filter((a) => a.roleId === role.id).length,
    }))
  }

  findAll(archived = false): Promise<ServiceRoleEntityRepo[]> {
    return this.list({ archivedAt: archived ? { not: null } : null })
  }

  async findByID(roleId: string): Promise<ServiceRoleEntityRepo> {
    const [role] = await this.list({ id: roleId })
    if (!role) {
      throw Boom.notFound('Rôle introuvable')
    }
    return role
  }

  async findActiveByName(
    name: string,
    exceptId?: string,
  ): Promise<{ id: string } | null> {
    return await this.prisma.serviceRoleDef.findFirst({
      where: {
        ...this.tenantContext.scope(),
        archivedAt: null,
        name: { equals: name, mode: 'insensitive' },
        ...(exceptId && { id: { not: exceptId } }),
      },
      select: { id: true },
    })
  }

  async findSoignants(
    soignantIds: string[],
  ): Promise<{ id: string; archivedAt: Date | null }[]> {
    return await this.prisma.soignant.findMany({
      where: { ...this.tenantContext.scope(), id: { in: soignantIds } },
      select: { id: true, archivedAt: true },
    })
  }

  async countDefaultOfActiveSoignants(roleId: string): Promise<number> {
    return await this.prisma.soignant.count({
      where: {
        ...this.tenantContext.scope(),
        defaultRoleId: roleId,
        archivedAt: null,
      },
    })
  }

  private hidden(soignantIds: string[]) {
    const { establishmentId } = this.tenantContext.scope()
    return soignantIds.map((soignantId) => ({ soignantId, establishmentId }))
  }

  async create(
    params: Required<Omit<ServiceRoleWriteEntityRepo, 'archived'>>,
  ): Promise<ServiceRoleEntityRepo> {
    const { id } = await this.prisma.serviceRoleDef.create({
      data: {
        ...this.tenantContext.scope(),
        name: params.name,
        permissions: params.permissions,
        hiddenSoignants: { create: this.hidden(params.hiddenSoignantIds) },
      },
      select: { id: true },
    })
    return this.findByID(id)
  }

  async update(
    roleId: string,
    params: ServiceRoleWriteEntityRepo,
  ): Promise<ServiceRoleEntityRepo> {
    const { serviceId } = this.tenantContext.scope()
    await this.prisma.serviceRoleDef.update({
      where: { id_serviceId: { id: roleId, serviceId } },
      data: {
        name: params.name,
        permissions: params.permissions,
        ...(params.archived !== undefined && {
          archivedAt: params.archived ? new Date() : null,
        }),
        ...(params.hiddenSoignantIds && {
          hiddenSoignants: {
            deleteMany: {},
            create: this.hidden(params.hiddenSoignantIds),
          },
        }),
      },
      select: { id: true },
    })
    return this.findByID(roleId)
  }

  // Filtre de relation depuis `Service` : marche aussi sans service de tenant (administration).
  async findActiveInService(
    roleId: string,
    serviceId: string,
  ): Promise<{ id: string } | null> {
    const { establishmentId } = this.tenantContext.establishmentScope()
    const service = await this.prisma.service.findFirst({
      where: {
        id: serviceId,
        establishmentId,
        roles: { some: { id: roleId, serviceId, archivedAt: null } },
      },
      select: { id: true },
    })
    return service ? { id: roleId } : null
  }
}

export { ServiceRoleRepository }
