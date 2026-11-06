import dayjs from 'dayjs'
import { describe, expect, it } from 'vitest'

import type { PdfDesignSummary } from '../../../../types/pdfDesignList.ts'
import type { Slot } from '../../../../types/slot.ts'
import {
  chooseDesign,
  creneauxDuProgramme,
  designsProposables,
} from './programme-pdf-modal.tsx'

const design = (id: string, isDefault = false): PdfDesignSummary => ({
  id,
  name: id,
  content: {
    version: 1,
    pages: [{ kind: 'canvas', id: 'p1', background: '#ffffff', elements: [] }],
  },
  isDefault,
  isDraft: false,
})

// Review Focus 3 de l'etape 2. Le test e2e correspondant n'assertait que « il reste des
// presets », ce qui etait deja vrai avant la suppression : il ne pouvait pas rougir. Le repli
// vit ici, dans l'ordre de la liste, et c'est ici qu'il se tient.
describe('chooseDesign', () => {
  it('prend le choix explicite avant tout', () => {
    const liste = [design('a'), design('b', true)]
    expect(chooseDesign(liste, 'a')?.id).toBe('a')
  })

  it('prend le design par defaut du service quand rien n est choisi', () => {
    const liste = [design('a'), design('b', true)]
    expect(chooseDesign(liste, null)?.id).toBe('b')
  })

  it('retombe sur le premier quand aucun n est par defaut', () => {
    const liste = [design('a'), design('b')]
    expect(chooseDesign(liste, null)?.id).toBe('a')
  })

  // Le cas du Review Focus : le service vient de supprimer son unique design, qui etait le
  // defaut. Il ne reste que les presets, et la modale doit en produire un, pas « aucun ».
  it('retombe sur un preset quand le service n a plus de design', () => {
    const presetsSeuls = [design('preset-smcv')]
    expect(chooseDesign(presetsSeuls, null)?.id).toBe('preset-smcv')
  })

  // Un identifiant qui ne correspond plus a rien : le design choisi vient d'etre supprime
  // dans un autre onglet, ou la liste a ete rafraichie sous les pieds de la modale.
  it('ignore un identifiant devenu introuvable au lieu de ne rien rendre', () => {
    const liste = [design('a'), design('b', true)]
    expect(chooseDesign(liste, 'disparu')?.id).toBe('b')
  })

  it('ne rend rien quand il n y a vraiment aucun design', () => {
    expect(chooseDesign([], null)).toBeUndefined()
  })
})

// Un brouillon se compose dans les reglages du service : il ne part pas chez un patient tant
// qu'il n'est pas termine.
describe('designsProposables', () => {
  const brouillon = (id: string): PdfDesignSummary => ({
    ...design(id),
    isDraft: true,
  })

  it('ecarte les brouillons du service', () => {
    const liste = designsProposables(
      [design('fini'), brouillon('en-cours')],
      [design('modele')],
    )
    expect(liste.map((d) => d.id)).toEqual(['fini', 'modele'])
  })

  it('garde les designs du service devant les modeles livres', () => {
    const liste = designsProposables([design('a')], [design('modele')])
    expect(liste.map((d) => d.id)).toEqual(['a', 'modele'])
  })

  // Un service dont tous les designs sont en brouillon n'exporte pas rien : il retombe sur
  // les modeles livres, comme un service qui n'en a aucun.
  it('retombe sur les modeles livres quand tout est en brouillon', () => {
    const liste = designsProposables(
      [brouillon('en-cours')],
      [design('modele')],
    )
    expect(liste.map((d) => d.id)).toEqual(['modele'])
  })
})

describe('creneauxDuProgramme', () => {
  const now = dayjs('2026-06-15T12:00:00Z')
  const slot = (id: string, startDate: string, patientId = 'p1') =>
    ({
      id,
      startDate,
      appointments: [{ appointmentPatients: [{ patient: { id: patientId } }] }],
    }) as unknown as Slot

  const slots = [
    slot('futur', '2026-06-20T09:00:00Z'),
    slot('passe', '2026-06-01T09:00:00Z'),
    slot('autre', '2026-06-21T09:00:00Z', 'p2'),
  ]

  it('ne garde que les rendez-vous a venir avec « a-venir »', () => {
    expect(
      creneauxDuProgramme(slots, 'p1', 'a-venir', now).map((s) => s.id),
    ).toEqual(['futur'])
  })

  it('reprend les rendez-vous passes, tries par date, avec « tous »', () => {
    expect(
      creneauxDuProgramme(slots, 'p1', 'tous', now).map((s) => s.id),
    ).toEqual(['passe', 'futur'])
  })
})
