import type { IocContainer } from '../../../types/application/ioc'
import type {
  ServiceRoleEntityRepo,
  ServiceRoleRepositoryInterface,
} from '../../../types/infra/orm/repositories/serviceRole.repository.interface'
import type { TenantContextInterface } from '../../../types/utils/tenant-context'
import { parsePermissions } from '../../../utils/permissions'
import type { PostgresPrismaClient } from '../postgres-client'

class ServiceRoleRepository implements ServiceRoleRepositoryInterface {
  private readonly prisma: PostgresPrismaClient
  private readonly tenantContext: TenantContextInterface

  constructor({ postgresOrm, tenantContext }: IocContainer) {
    this.prisma = postgresOrm.prisma
    this.tenantContext = tenantContext
  }

  async findAll(archived = false): Promise<ServiceRoleEntityRepo[]> {
    const scope = this.tenantContext.scope()
    const [roles, affectations] = await Promise.all([
      this.prisma.serviceRoleDef.findMany({
        where: { ...scope, archivedAt: archived ? { not: null } : null },
        select: {
          id: true,
          name: true,
          preset: true,
          permissions: true,
          archivedAt: true,
          hiddenSoignants: { select: { soignantId: true } },
        },
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

  // Lu depuis `Service` (modèle d'établissement) par un filtre de relation : le garde exige le
  // serviceId du tenant pour lire `ServiceRoleDef`, absent en administration d'établissement.
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
