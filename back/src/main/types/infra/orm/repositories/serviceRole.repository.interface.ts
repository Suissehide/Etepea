import type { ServiceRole } from '../../../../../generated/enums'
import type { ServicePermission } from '../../../../utils/permissions'

export type ServiceRoleEntityRepo = {
  id: string
  name: string
  preset: ServiceRole | null
  permissions: string[]
  hiddenSoignantIds: string[]
  memberCount: number
  archivedAt: Date | null
}

export type ServiceRoleWriteEntityRepo = {
  name?: string
  permissions?: ServicePermission[]
  hiddenSoignantIds?: string[]
  archived?: boolean
}

export interface ServiceRoleRepositoryInterface {
  // Sous le contexte de SERVICE : les rôles du service courant, non supprimés ou supprimés.
  findAll: (archived?: boolean) => Promise<ServiceRoleEntityRepo[]>
  // Supprimé ou non ; 404 hors du service courant.
  findByID: (roleId: string) => Promise<ServiceRoleEntityRepo>
  findActiveByName: (
    name: string,
    exceptId?: string,
  ) => Promise<{ id: string } | null>
  // Soignants du service courant parmi ces ids, supprimés compris.
  findSoignants: (
    soignantIds: string[],
  ) => Promise<{ id: string; archivedAt: Date | null }[]>
  countDefaultOfActiveSoignants: (roleId: string) => Promise<number>
  create: (
    params: Required<Omit<ServiceRoleWriteEntityRepo, 'archived'>>,
  ) => Promise<ServiceRoleEntityRepo>
  update: (
    roleId: string,
    params: ServiceRoleWriteEntityRepo,
  ) => Promise<ServiceRoleEntityRepo>
  // Le rôle, non supprimé, du service donné de l'établissement courant ; marche aussi sans service de tenant.
  findActiveInService: (
    roleId: string,
    serviceId: string,
  ) => Promise<{ id: string } | null>
}
