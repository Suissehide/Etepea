import { tenantApiUrl } from '../constants/config.constant.ts'
import { handleHttpError } from '../libs/httpErrorHandler.ts'
import type { LegacyAppointment } from '../types/legacyAppointment.ts'
import { fetchWithAuth } from './fetchWithAuth.ts'

export const LegacyAppointmentApi = {
  // null : fonctionnalité éteinte pour ce service (404).
  getAll: async (): Promise<LegacyAppointment[] | null> => {
    const response = await fetchWithAuth(
      `${tenantApiUrl()}/legacy-appointments`,
      { method: 'GET' },
    )
    if (response.status === 404) {
      return null
    }
    if (!response.ok) {
      handleHttpError(
        response,
        {},
        "Impossible de récupérer les rendez-vous de l'ancienne app",
      )
    }
    return response.json()
  },

  setReported: async (
    id: string,
    reported: boolean,
  ): Promise<LegacyAppointment> => {
    const response = await fetchWithAuth(
      `${tenantApiUrl()}/legacy-appointments/${id}`,
      {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ reported }),
      },
    )
    if (!response.ok) {
      handleHttpError(
        response,
        {},
        'Impossible de mettre à jour le rendez-vous',
      )
    }
    return response.json()
  },
}
