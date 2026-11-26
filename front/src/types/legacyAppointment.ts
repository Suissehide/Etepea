export type LegacyAppointment = {
  id: string
  legacyId: string
  date: string
  time: string
  durationMinutes: number | null
  patientName: string
  thematic: string | null
  type: 'ambulatory' | 'hospital' | 'telephonic' | null
  receivedAt: string
  reportedAt: string | null
}
