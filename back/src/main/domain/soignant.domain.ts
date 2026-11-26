import Boom from '@hapi/boom'

import type { IocContainer } from '../types/application/ioc'
import type {
  SoignantCreateEntityDomain,
  SoignantDomainInterface,
  SoignantEntityDomain,
  SoignantUpdateEntityDomain,
} from '../types/domain/soignant.domain.interface'
import type { ServiceRoleRepositoryInterface } from '../types/infra/orm/repositories/serviceRole.repository.interface'
import type { SoignantRepositoryInterface } from '../types/infra/orm/repositories/soignant.repository.interface'
import type { TenantContextInterface } from '../types/utils/tenant-context'

class SoignantDomain implements SoignantDomainInterface {
  private readonly soignantRepository: SoignantRepositoryInterface

  private readonly serviceRoleRepository: ServiceRoleRepositoryInterface
  private readonly tenantContext: TenantContextInterface

  constructor({
    soignantRepository,
    serviceRoleRepository,
    tenantContext,
  }: IocContainer) {
    this.soignantRepository = soignantRepository
    this.serviceRoleRepository = serviceRoleRepository
    this.tenantContext = tenantContext
  }

  findAll(archived?: boolean): Promise<SoignantEntityDomain[]> {
    return this.soignantRepository.findAll(archived)
  }

  findByID(soignantID: string): Promise<SoignantEntityDomain> {
    return this.soignantRepository.findByID(soignantID)
  }

  create(
    soignantCreateParams: SoignantCreateEntityDomain,
  ): Promise<SoignantEntityDomain> {
    const soignantInputParams = {
      ...soignantCreateParams,
    }
    return this.soignantRepository.create(soignantInputParams)
  }

  async update(
    soignantID: string,
    soignantUpdateParams: SoignantUpdateEntityDomain,
  ): Promise<SoignantEntityDomain> {
    const { defaultRoleId } = soignantUpdateParams
    if (
      typeof defaultRoleId === 'string' &&
      !(await this.serviceRoleRepository.findActiveInService(
        defaultRoleId,
        this.tenantContext.scope().serviceId,
      ))
    ) {
      throw Boom.badRequest('Rôle inconnu dans ce service')
    }
    return this.soignantRepository.update(soignantID, soignantUpdateParams)
  }

  async updateWithMembers(
    soignantID: string,
    soignantUpdateParams: SoignantUpdateEntityDomain,
  ) {
    const soignant = await this.update(soignantID, soignantUpdateParams)
    const membersWithOtherRole =
      await this.soignantRepository.countMembersWithOtherRole(
        soignantID,
        soignant.defaultRoleId,
      )
    return { ...soignant, membersWithOtherRole }
  }
  deleteForever(soignantID: string): Promise<void> {
    return this.soignantRepository.deleteForever(soignantID)
  }
}

export { SoignantDomain }
