import { apiUrl } from '../constants/config.constant.ts'
import { handleHttpError, messageDuServeur } from '../libs/httpErrorHandler.ts'
import { fetchWithAuth } from './fetchWithAuth.ts'
import type { ServiceRef } from './inbox.api.ts'

export const PlanningRestoreApi = {
  // Le service est celui de la ligne du journal ou de la notification, pas le tenant courant.
  restore: async (
    service: ServiceRef,
    activityLogId: string,
  ): Promise<void> => {
    const response = await fetchWithAuth(
      `${apiUrl}/e/${service.establishmentId}/s/${service.serviceId}/planning/restore/${activityLogId}`,
      { method: 'POST' },
    )
    if (!response.ok) {
      const message = await messageDuServeur(response)
      const info = message
        ? { title: 'Restauration impossible', message }
        : undefined
      handleHttpError(
        response,
        info ? { 404: info, 409: info } : {},
        'Impossible de restaurer la suppression',
      )
    }
  },
}
