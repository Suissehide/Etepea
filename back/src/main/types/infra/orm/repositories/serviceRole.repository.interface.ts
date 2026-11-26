import type { ServiceRole } from '../../../../../generated/enums'

export type ServiceRoleEntityRepo = {
  id: string
  name: string
  preset: ServiceRole | null
  permissions: string[]
  hiddenSoignantIds: string[]
  memberCount: number
  archivedAt: Date | null
}

export interface ServiceRoleRepositoryInterface {
  // Sous le contexte de SERVICE : les rôles du service courant, non supprimés ou supprimés.
  findAll: (archived?: boolean) => Promise<ServiceRoleEntityRepo[]>
  // Le rôle, non supprimé, du service donné de l'établissement courant ; marche aussi sans service de tenant.
  findActiveInService: (
    roleId: string,
    serviceId: string,
  ) => Promise<{ id: string } | null>
}
