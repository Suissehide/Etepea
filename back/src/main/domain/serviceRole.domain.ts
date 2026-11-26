import type { IocContainer } from '../types/application/ioc'
import type {
  ServiceRoleDomainInterface,
  ServiceRoleEntityDomain,
} from '../types/domain/serviceRole.domain.interface'
import type { ServiceRoleRepositoryInterface } from '../types/infra/orm/repositories/serviceRole.repository.interface'

class ServiceRoleDomain implements ServiceRoleDomainInterface {
  private readonly serviceRoleRepository: ServiceRoleRepositoryInterface

  constructor({ serviceRoleRepository }: IocContainer) {
    this.serviceRoleRepository = serviceRoleRepository
  }

  findAll(archived?: boolean): Promise<ServiceRoleEntityDomain[]> {
    return this.serviceRoleRepository.findAll(archived)
  }
}

export { ServiceRoleDomain }
