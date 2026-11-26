import type { ServiceRoleEntityRepo } from '../infra/orm/repositories/serviceRole.repository.interface'

export type ServiceRoleEntityDomain = ServiceRoleEntityRepo

export interface ServiceRoleDomainInterface {
  findAll: (archived?: boolean) => Promise<ServiceRoleEntityDomain[]>
}
