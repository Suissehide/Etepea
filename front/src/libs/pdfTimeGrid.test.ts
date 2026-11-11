import dayjs from 'dayjs'
import utc from 'dayjs/plugin/utc'
import { describe, expect, it } from 'vitest'

import type { Slot } from '../types/slot.ts'
import {
  buildTimeAxis,
  findGaps,
  innerHours,
  layoutDay,
} from './pdfTimeGrid.ts'

dayjs.extend(utc)

const slot = (id: string, start: string, end: string) =>
  ({
    id,
    startDate: `2026-10-12T${start}:00Z`,
    endDate: `2026-10-12T${end}:00Z`,
  }) as Slot

const lanes = (slots: Slot[]) =>
  layoutDay(slots).map(({ slot, lane, laneCount }) => [
    slot.id,
    lane,
    laneCount,
  ])

describe('layoutDay', () => {
  it('ne partage la largeur qu’entre créneaux qui se chevauchent', () => {
    expect(
      lanes([
        slot('a', '09:00', '11:00'),
        slot('b', '10:00', '12:00'),
        slot('c', '11:00', '12:00'),
        slot('d', '14:00', '15:00'),
      ]),
    ).toEqual([
      ['a', 0, 2],
      ['b', 1, 2],
      ['c', 0, 2],
      ['d', 0, 1],
    ])
  })
})

describe('innerHours', () => {
  it('ne garde que les heures pleines strictement dans l’axe', () => {
    expect(innerHours(8 * 60 + 30, 12 * 60 + 15)).toEqual([540, 600, 660, 720])
    expect(innerHours(9 * 60, 11 * 60)).toEqual([600])
  })
})

describe('findGaps / buildTimeAxis (MDS-80)', () => {
  // Atelier 9h45-11h un jour, parcours RC dès 13h45 les autres jours.
  const semaine = [
    layoutDay([slot('rc1', '13:45', '15:00'), slot('rc2', '15:00', '16:15')]),
    layoutDay([slot('tabac', '09:45', '11:00')]),
    layoutDay([slot('rc3', '13:45', '15:00')]),
  ]

  it('repère le trou commun à tous les jours, au-delà du seuil', () => {
    expect(findGaps(semaine, 60)).toEqual([{ start: 660, end: 825 }])
    expect(findGaps(semaine, 180)).toEqual([])
  })

  it('ramène le trou à une bande et saute les heures qui y tombent', () => {
    const axis = buildTimeAxis({
      startMinute: 585,
      endMinute: 975,
      gaps: findGaps(semaine, 60),
      hourHeight: 60,
      bandHeight: 10,
    })
    expect(axis.y(660)).toBe(75)
    expect(axis.y(825)).toBe(85)
    expect(axis.height).toBe(85 + 150)
    expect(axis.hours).toEqual([600, 660, 840, 900, 960])
    expect(axis.bands).toEqual([{ top: 75, height: 10 }])
  })

  it('sans trou, garde l’axe continu', () => {
    const axis = buildTimeAxis({
      startMinute: 600,
      endMinute: 720,
      gaps: [],
      hourHeight: 44,
      bandHeight: 10,
    })
    expect(axis.height).toBe(88)
    expect(axis.hours).toEqual([660])
  })
})
