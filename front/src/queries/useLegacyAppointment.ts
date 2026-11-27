import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'

import { LegacyAppointmentApi } from '../api/legacyAppointment.api.ts'
import { LEGACY_APPOINTMENT } from '../constants/process.constant.ts'
import { TOAST_SEVERITY } from '../constants/ui.constant.ts'
import { useToast } from '../hooks/useToast.ts'

// `enabled` laisse la barre de navigation n'interroger que sous un service.
export const useLegacyAppointmentsQuery = (enabled = true) =>
  useQuery({
    queryKey: [LEGACY_APPOINTMENT.GET_ALL],
    queryFn: LegacyAppointmentApi.getAll,
    retry: 0,
    enabled,
  })

export const useSetLegacyAppointmentReported = () => {
  const queryClient = useQueryClient()
  const { toast } = useToast()
  return useMutation({
    mutationKey: [LEGACY_APPOINTMENT.SET_REPORTED],
    mutationFn: ({ id, reported }: { id: string; reported: boolean }) =>
      LegacyAppointmentApi.setReported(id, reported),
    onError: (error) => {
      toast({
        title: 'Erreur lors de la mise à jour',
        message: error.message,
        severity: TOAST_SEVERITY.ERROR,
      })
    },
    onSettled: () =>
      queryClient.invalidateQueries({
        queryKey: [LEGACY_APPOINTMENT.GET_ALL],
      }),
  })
}
