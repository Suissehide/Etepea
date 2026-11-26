import {
  type UseQueryResult,
  useMutation,
  useQueries,
  useQuery,
  useQueryClient,
} from '@tanstack/react-query'
import { useCallback } from 'react'

import { RolesApi } from '../api/roles.api.ts'
import { ROLE, SERVICE_MEMBER } from '../constants/process.constant.ts'
import { TOAST_SEVERITY } from '../constants/ui.constant.ts'
import { useToast } from '../hooks/useToast.ts'
import type { Role } from '../types/role.ts'

const AUCUN: Role[] = []

// Rôles du service courant : clé sans tenant (client de requêtes neuf par service).
export const useRolesQuery = (archived = false) => {
  const { data: roles, isPending } = useQuery({
    queryKey: [ROLE.GET_ALL, archived],
    queryFn: () => RolesApi.getAll(archived),
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

export const useRoleMutations = () => {
  const queryClient = useQueryClient()
  const { toast } = useToast()

  // Un rôle modifié change aussi ce que montre Membres.
  const onSettled = async () => {
    await Promise.all([
      queryClient.invalidateQueries({ queryKey: [ROLE.GET_ALL] }),
      queryClient.invalidateQueries({ queryKey: [SERVICE_MEMBER.GET_ALL] }),
    ])
  }
  const options = (success: string, failure: string) => ({
    onSuccess: () =>
      toast({ title: success, severity: TOAST_SEVERITY.SUCCESS }),
    onError: (error: Error) =>
      toast({
        title: failure,
        message: error.message,
        severity: TOAST_SEVERITY.ERROR,
      }),
    onSettled,
  })

  return {
    createRole: useMutation({
      mutationFn: RolesApi.create,
      ...options('Rôle créé', 'Erreur lors de la création du rôle'),
    }),
    updateRole: useMutation({
      mutationFn: RolesApi.update,
      ...options('Rôle enregistré', "Erreur lors de l'enregistrement du rôle"),
    }),
    deleteRole: useMutation({
      mutationFn: RolesApi.delete,
      ...options('Rôle supprimé', 'Erreur lors de la suppression du rôle'),
    }),
    restoreRole: useMutation({
      mutationFn: RolesApi.restore,
      ...options('Rôle restauré', 'Erreur lors de la restauration du rôle'),
    }),
  }
}
