import {
  establishmentServiceApiUrl,
  tenantApiUrl,
} from '../constants/config.constant.ts'
import { handleHttpError, messageDuServeur } from '../libs/httpErrorHandler.ts'
import type { Role } from '../types/role.ts'
import { fetchWithAuth } from './fetchWithAuth.ts'

export type RoleInput = {
  name: string
  permissions: string[]
}

const fetchRoles = async (url: string): Promise<Role[]> => {
  const response = await fetchWithAuth(url, { method: 'GET' })
  if (!response.ok) {
    handleHttpError(response, {}, 'Impossible de récupérer les rôles')
  }
  return response.json()
}

// Le 409 porte un message rédigé par le serveur (nom pris, rôle encore attribué).
const write = async (
  url: string,
  method: string,
  defaultMessage: string,
  body?: unknown,
): Promise<Response> => {
  const response = await fetchWithAuth(url, {
    method,
    headers: body ? { 'Content-Type': 'application/json' } : undefined,
    body: body ? JSON.stringify(body) : undefined,
  })
  if (!response.ok) {
    const message = await messageDuServeur(response)
    handleHttpError(
      response,
      message ? { 409: { title: 'Action refusée', message } } : {},
      defaultMessage,
    )
  }
  return response
}

// Rôles d'un service (`members:read`) ; `archived` : ceux qui ont été supprimés.
export const RolesApi = {
  getAll: (archived = false): Promise<Role[]> =>
    fetchRoles(`${tenantApiUrl()}/roles${archived ? '?archived=true' : ''}`),

  // Écran d'administration d'établissement : le service est une donnée de la requête.
  getForService: (serviceId: string): Promise<Role[]> =>
    fetchRoles(`${establishmentServiceApiUrl(serviceId)}/roles`),

  create: async (input: RoleInput): Promise<Role> =>
    (
      await write(
        `${tenantApiUrl()}/roles`,
        'POST',
        'Impossible de créer le rôle',
        input,
      )
    ).json(),

  update: ({ id, ...input }: Partial<RoleInput> & { id: string }) =>
    write(
      `${tenantApiUrl()}/roles/${id}`,
      'PATCH',
      'Impossible de modifier le rôle',
      input,
    ),

  delete: (id: string) =>
    write(
      `${tenantApiUrl()}/roles/${id}`,
      'DELETE',
      'Impossible de supprimer le rôle',
    ),

  restore: (id: string) =>
    write(
      `${tenantApiUrl()}/roles/${id}/restore`,
      'POST',
      'Impossible de restaurer le rôle',
    ),
}
