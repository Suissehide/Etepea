import { describe, expect, it } from 'vitest'

import type { PathwayTemplate } from '../types/pathwayTemplate.ts'
import { countSlotTemplates, pathwayIssues } from './pathwayChecks.ts'

const template = (
  id: string,
  extra: Partial<PathwayTemplate> = {},
): PathwayTemplate => ({
  id,
  name: id.toUpperCase(),
  color: `#00000${id.length}`,
  mainTag: id,
  secondaryTags: [],
  displayOrder: 0,
  motifRequired: false,
  firstAppointmentOnly: false,
  optional: false,
  prerequisiteIDs: [],
  slotTemplates: [
    { id: `${id}-1`, isIndividual: false, thematicId: 't1' },
  ] as PathwayTemplate['slotTemplates'],
  ...extra,
})

describe('pathwayIssues', () => {
  it('ne signale rien sur un parcours bien configuré', () => {
    const rc = template('rc')
    expect(pathwayIssues(rc, [rc])).toEqual([])
  })

  it('signale les créneaux qui ne collent pas au mode et l’absence de créneau', () => {
    const ri = template('ri', {
      slotTemplates: [
        { id: 'a', isIndividual: true },
        { id: 'b', isIndividual: true },
        { id: 'c', isIndividual: false },
      ] as PathwayTemplate['slotTemplates'],
    })
    const psy = template('psy', {
      firstAppointmentOnly: true,
      slotTemplates: [],
    })
    expect(pathwayIssues(ri, [ri])).toEqual([
      '2 créneaux individuels dans un parcours « tous les RDV »',
    ])
    expect(pathwayIssues(psy, [psy])).toEqual(['Aucun créneau'])
  })

  it('signale tag manquant, couleur en double et dépendance circulaire', () => {
    const diet = template('diet', {
      color: '#0d9488',
      prerequisiteIDs: ['etp'],
    })
    const etp = template('etp', {
      mainTag: ' ',
      prerequisiteIDs: ['diet'],
    })
    const ssr = template('ssr', { color: '#0D9488' })
    const all = [diet, etp, ssr]
    expect(pathwayIssues(diet, all)).toEqual([
      'Même couleur que « SSR »',
      'Dépendance circulaire avec « ETP »',
    ])
    expect(pathwayIssues(etp, all)).toEqual([
      'Tag principal manquant',
      'Dépendance circulaire avec « DIET »',
    ])
  })
})

describe('countSlotTemplates', () => {
  it('compte collectifs, individuels et thématiques distinctes', () => {
    expect(
      countSlotTemplates(
        template('x', {
          slotTemplates: [
            { id: 'a', isIndividual: true, thematicId: 't1' },
            { id: 'b', isIndividual: false, thematicId: 't1' },
            { id: 'c', isIndividual: false, thematicId: 't2' },
          ] as PathwayTemplate['slotTemplates'],
        }),
      ),
    ).toEqual({ total: 3, individual: 1, collective: 2, thematics: 2 })
  })
})
