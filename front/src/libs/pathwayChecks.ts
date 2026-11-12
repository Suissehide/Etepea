import type { PathwayTemplate } from '../types/pathwayTemplate.ts'

/** Créneaux d'un modèle de parcours, comptés pour le résumé des parcours. */
export const countSlotTemplates = (template: PathwayTemplate) => {
  const slots = template.slotTemplates ?? []
  const individual = slots.filter((slot) => slot.isIndividual).length
  return {
    total: slots.length,
    individual,
    collective: slots.length - individual,
    thematics: new Set(slots.map((slot) => slot.thematicId).filter(Boolean))
      .size,
  }
}

/** « 1 créneau individuel », « 2 créneaux individuels ». */
const slotsLabel = (n: number, kind: string) =>
  `${n} ${n > 1 ? 'créneaux' : 'créneau'} ${kind}${n > 1 ? 's' : ''}`

/**
 * Configurations suspectes d'un modèle de parcours, pour le résumé des
 * parcours : on les signale sans rien bloquer.
 */
export function pathwayIssues(
  template: PathwayTemplate,
  all: PathwayTemplate[],
): string[] {
  const issues: string[] = []
  const { total, individual, collective } = countSlotTemplates(template)
  if (total === 0) {
    issues.push('Aucun créneau')
  }
  if (!template.firstAppointmentOnly && individual > 0) {
    issues.push(
      `${slotsLabel(individual, 'individuel')} dans un parcours « tous les RDV »`,
    )
  }
  if (template.firstAppointmentOnly && collective > 0) {
    issues.push(
      `${slotsLabel(collective, 'collectif')} dans un parcours « premier créneau »`,
    )
  }
  if (!template.mainTag?.trim()) {
    issues.push('Tag principal manquant')
  }
  const twin = all.find(
    (other) =>
      other.id !== template.id &&
      other.color.toLowerCase() === template.color.toLowerCase(),
  )
  if (twin) {
    issues.push(`Même couleur que « ${twin.name} »`)
  }
  if (template.prerequisiteIDs.includes(template.id)) {
    issues.push('Dépend de lui-même')
  }
  const loop = all.find(
    (other) =>
      other.id !== template.id &&
      template.prerequisiteIDs.includes(other.id) &&
      other.prerequisiteIDs.includes(template.id),
  )
  if (loop) {
    issues.push(`Dépendance circulaire avec « ${loop.name} »`)
  }
  return issues
}
