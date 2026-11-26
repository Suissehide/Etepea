import {
  type UseQueryResult,
  useQueries,
  useQuery,
} from '@tanstack/react-query'
import { useCallback } from 'react'

import { RolesApi } from '../api/roles.api.ts'
import { ROLE } from '../constants/process.constant.ts'
import type { Role } from '../types/role.ts'

const AUCUN: Role[] = []

// Rôles du service courant : clé sans tenant (client de requêtes neuf par service).
export const useRolesQuery = () => {
  const { data: roles, isPending } = useQuery({
    queryKey: [ROLE.GET_ALL],
    queryFn: RolesApi.getAll,
    retry: 0,
  })
  return { roles: roles ?? AUCUN, isPending }
}

// Écran d'établissement : une requête par service affiché, la clé portant le service demandé.
// `combine` stable : l'objet rendu ne change que si une liste change (pas de colonnes neuves à chaque rendu).
export const useRolesByService = (
  serviceIds: string[],
): Record<string, Role[]> => {
  const ids = serviceIds.join('|')
  const combine = useCallback(
    (results: UseQueryResult<Role[]>[]) =>
      Object.fromEntries(
        (ids ? ids.split('|') : []).map((id, i) => [
          id,
          results[i]?.data ?? AUCUN,
        ]),
      ),
    [ids],
  )
  return useQueries({
    queries: serviceIds.map((serviceId) => ({
      queryKey: [ROLE.GET_FOR_SERVICE, serviceId],
      queryFn: () => RolesApi.getForService(serviceId),
      retry: 0,
    })),
    combine,
  })
}
