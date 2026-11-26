import {
  establishmentServiceApiUrl,
  tenantApiUrl,
} from '../constants/config.constant.ts'
import { handleHttpError } from '../libs/httpErrorHandler.ts'
import type { Role } from '../types/role.ts'
import { fetchWithAuth } from './fetchWithAuth.ts'

const fetchRoles = async (url: string): Promise<Role[]> => {
  const response = await fetchWithAuth(url, { method: 'GET' })
  if (!response.ok) {
    handleHttpError(response, {}, 'Impossible de récupérer les rôles')
  }
  return response.json()
}

// Rôles non supprimés d'un service (`members:read`).
export const RolesApi = {
  getAll: (): Promise<Role[]> => fetchRoles(`${tenantApiUrl()}/roles`),

  // Écran d'administration d'établissement : le service est une donnée de la requête.
  getForService: (serviceId: string): Promise<Role[]> =>
    fetchRoles(`${establishmentServiceApiUrl(serviceId)}/roles`),
}
