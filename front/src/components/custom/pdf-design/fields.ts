import type { Patient, PatientPathway } from '../../../types/patient.ts'
import type { PdfFieldKey } from '../../../types/pdfDesign.ts'
import type { Slot } from '../../../types/slot.ts'
import { computeProgramDuration } from '../Patient/pdf/programme-pdf.utils.ts'

export type PdfFieldContext = {
  patient: Patient
  pathways: PatientPathway[]
  upcomingSlots: Slot[]
  serviceName: string
}

// Le nom VISIBLE d'une donnee, partout : l'etiquette dans le texte de la toile, le bouton
// d'insertion de l'inspecteur et le libelle du calque. Trois endroits, un seul libelle.
export const LIBELLES_DONNEES: Record<PdfFieldKey, string> = {
  'patient.name': 'Nom du patient',
  'pathway.name': 'Nom du parcours',
  'program.dates': 'Dates du programme',
  'service.name': 'Nom du service',
}

// Une donnee nouvelle = une entree ici plus son cas dans fields.test.ts.
const RESOLVERS: Record<PdfFieldKey, (ctx: PdfFieldContext) => string> = {
  'patient.name': ({ patient }) => `${patient.lastName} ${patient.firstName}`,
  'service.name': ({ serviceName }) => serviceName,
  // Meme chaine de replis que la couverture d'aujourd'hui.
  'pathway.name': ({ pathways }) => {
    const first = pathways[0]
    return first?.templateName || first?.templateMainTag || 'Programme'
  },
  // Chaine vide, jamais « Du Invalid Date » : sans creneau a venir le texte disparait, comme
  // le <Text> conditionnel de la couverture actuelle.
  'program.dates': ({ upcomingSlots }) => {
    const duration = computeProgramDuration(upcomingSlots)
    if (!duration) {
      return ''
    }
    return `Du ${duration.startDate.format('DD/MM')} au ${duration.endDate.format('DD/MM/YYYY')}`
  },
}

export const resolveField = (key: PdfFieldKey, ctx: PdfFieldContext): string =>
  RESOLVERS[key](ctx)

// Affiche dans l'editeur a la place d'un vrai patient (etape 2).
export const SAMPLE_FIELD_VALUES: Record<PdfFieldKey, string> = {
  'patient.name': 'DUPONT Jean',
  'pathway.name': 'Réadaptation cardiaque',
  'program.dates': 'Du 12/05 au 28/06/2026',
  'service.name': 'SMCV',
}

// Le MEME echantillon, sous la forme d'un contexte : l'apercu PDF de l'editeur passe par
// `pagesOf`, qui resout les donnees plutot que de lire le dictionnaire ci-dessus. Les deux
// doivent dire la meme chose, et `fields.test.ts` le tient.
export const SAMPLE_FIELD_CONTEXT: PdfFieldContext = {
  patient: { firstName: 'Jean', lastName: 'DUPONT' } as Patient,
  pathways: [{ templateName: 'Réadaptation cardiaque' }] as PatientPathway[],
  upcomingSlots: [
    { startDate: '2026-05-12T08:00:00.000Z' },
    { startDate: '2026-06-28T08:00:00.000Z' },
  ] as Slot[],
  serviceName: 'SMCV',
}

// Noir, ou blanc quand le fond est trop fonce (luminance relative WCAG sous 0,179).
export const contrasteDe = (fond: string): string => {
  if (!/^#[0-9a-f]{6}$/i.test(fond)) {
    return '#000000'
  }
  const [r, g, b] = [1, 3, 5].map((i) => {
    const c = Number.parseInt(fond.slice(i, i + 2), 16) / 255
    return c <= 0.039_28 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4
  })
  return 0.2126 * r + 0.7152 * g + 0.0722 * b < 0.179 ? '#ffffff' : '#000000'
}
