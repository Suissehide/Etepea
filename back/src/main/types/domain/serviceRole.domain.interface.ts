import type { ServicePermission } from '../../utils/permissions'
import type { ServiceRoleEntityRepo } from '../infra/orm/repositories/serviceRole.repository.interface'

export type ServiceRoleEntityDomain = ServiceRoleEntityRepo

export type ServiceRoleCreateDomain = {
  name: string
  permissions: ServicePermission[]
}

export type ServiceRoleUpdateDomain = Partial<ServiceRoleCreateDomain>

export interface ServiceRoleDomainInterface {
  findAll: (archived?: boolean) => Promise<ServiceRoleEntityDomain[]>
  create: (params: ServiceRoleCreateDomain) => Promise<ServiceRoleEntityDomain>
  update: (
    roleId: string,
    params: ServiceRoleUpdateDomain,
  ) => Promise<ServiceRoleEntityDomain>
  // 409 tant qu'un membre le tient ou qu'il est le rôle par défaut d'un soignant actif.
  archive: (roleId: string) => Promise<void>
  restore: (roleId: string) => Promise<ServiceRoleEntityDomain>
}
