import Boom from '@hapi/boom'

import type { IocContainer } from '../types/application/ioc'
import type {
  ServiceRoleCreateDomain,
  ServiceRoleDomainInterface,
  ServiceRoleEntityDomain,
  ServiceRoleUpdateDomain,
} from '../types/domain/serviceRole.domain.interface'
import type { ServiceRoleRepositoryInterface } from '../types/infra/orm/repositories/serviceRole.repository.interface'
import type { TenantContextInterface } from '../types/utils/tenant-context'
import type { AppEventBus } from '../utils/app-event-bus'
import { parsePermissions } from '../utils/permissions'

class ServiceRoleDomain implements ServiceRoleDomainInterface {
  private readonly serviceRoleRepository: ServiceRoleRepositoryInterface
  private readonly appEventBus: AppEventBus
  private readonly tenantContext: TenantContextInterface

  constructor({
    serviceRoleRepository,
    appEventBus,
    tenantContext,
  }: IocContainer) {
    this.serviceRoleRepository = serviceRoleRepository
    this.appEventBus = appEventBus
    this.tenantContext = tenantContext
  }

  findAll(archived?: boolean): Promise<ServiceRoleEntityDomain[]> {
    return this.serviceRoleRepository.findAll(archived)
  }

  async create(
    params: ServiceRoleCreateDomain,
  ): Promise<ServiceRoleEntityDomain> {
    await this.assertNameFree(params.name)
    const hiddenSoignantIds = await this.checkedSoignants(
      params.hiddenSoignantIds ?? [],
    )
    const role = await this.serviceRoleRepository.create({
      name: params.name,
      permissions: parsePermissions(params.permissions),
      hiddenSoignantIds,
    })
    this.emit('role.created', role)
    return role
  }

  async update(
    roleId: string,
    params: ServiceRoleUpdateDomain,
  ): Promise<ServiceRoleEntityDomain> {
    await this.serviceRoleRepository.findByID(roleId)
    if (params.name !== undefined) {
      await this.assertNameFree(params.name, roleId)
    }
    const role = await this.serviceRoleRepository.update(roleId, {
      name: params.name,
      permissions: params.permissions && parsePermissions(params.permissions),
      hiddenSoignantIds:
        params.hiddenSoignantIds &&
        (await this.checkedSoignants(params.hiddenSoignantIds)),
    })
    this.emit('role.updated', role)
    return role
  }

  async archive(roleId: string): Promise<void> {
    const role = await this.serviceRoleRepository.findByID(roleId)
    if (role.memberCount > 0) {
      throw Boom.conflict(
        `Rôle encore attribué à ${role.memberCount} membre(s)`,
      )
    }
    const defauts =
      await this.serviceRoleRepository.countDefaultOfActiveSoignants(roleId)
    if (defauts > 0) {
      throw Boom.conflict(`Rôle par défaut de ${defauts} soignant(s)`)
    }
    const archived = await this.serviceRoleRepository.update(roleId, {
      archived: true,
    })
    this.emit('role.archived', archived)
  }

  async restore(roleId: string): Promise<ServiceRoleEntityDomain> {
    const role = await this.serviceRoleRepository.findByID(roleId)
    await this.assertNameFree(role.name, roleId)
    const restored = await this.serviceRoleRepository.update(roleId, {
      archived: false,
    })
    this.emit('role.restored', restored)
    return restored
  }

  private async assertNameFree(name: string, exceptId?: string): Promise<void> {
    if (await this.serviceRoleRepository.findActiveByName(name, exceptId)) {
      throw Boom.conflict(`Un rôle s'appelle déjà « ${name} ».`)
    }
  }

  private async checkedSoignants(soignantIds: string[]): Promise<string[]> {
    const uniques = [...new Set(soignantIds)]
    const actifs =
      await this.serviceRoleRepository.countActiveSoignants(uniques)
    if (actifs !== uniques.length) {
      throw Boom.badRequest('Soignant inconnu dans ce service')
    }
    return uniques
  }

  private emit(
    event: 'role.created' | 'role.updated' | 'role.archived' | 'role.restored',
    role: ServiceRoleEntityDomain,
  ): void {
    this.appEventBus.emit(event, {
      userID: this.tenantContext.current().userId,
      roleId: role.id,
      detail: role.name,
    })
  }
}

export { ServiceRoleDomain }
