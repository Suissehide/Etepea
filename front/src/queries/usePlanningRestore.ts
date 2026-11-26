import { useMutation, useQueryClient } from '@tanstack/react-query'

import type { ServiceRef } from '../api/inbox.api.ts'
import { PlanningRestoreApi } from '../api/planningRestore.api.ts'
import {
  ACTIVITY_LOG,
  FORBIDDEN_WEEK,
  PATHWAY,
  PLANNING_CYCLE,
  SLOT,
} from '../constants/process.constant.ts'
import { TOAST_SEVERITY } from '../constants/ui.constant.ts'
import { useToast } from '../hooks/useToast.ts'

const PLANNING_KEYS = [
  ACTIVITY_LOG.GET_ALL,
  SLOT.GET_ALL,
  SLOT.GET_BY_ID,
  SLOT.CONFLICTS,
  PATHWAY.GET_ALL,
  FORBIDDEN_WEEK.GET_ALL,
  PLANNING_CYCLE.GET,
]

export const usePlanningRestore = () => {
  const queryClient = useQueryClient()
  const { toast } = useToast()

  return useMutation({
    mutationFn: ({
      service,
      activityLogId,
    }: {
      service: ServiceRef
      activityLogId: string
    }) => PlanningRestoreApi.restore(service, activityLogId),
    onSuccess: () =>
      toast({
        title: 'Suppression restaurée',
        severity: TOAST_SEVERITY.SUCCESS,
      }),
    onError: (error) =>
      toast({
        title: 'Erreur lors de la restauration',
        message: error.message,
        severity: TOAST_SEVERITY.ERROR,
      }),
    onSettled: () =>
      Promise.all(
        PLANNING_KEYS.map((queryKey) =>
          queryClient.invalidateQueries({ queryKey: [queryKey] }),
        ),
      ),
  })
}
