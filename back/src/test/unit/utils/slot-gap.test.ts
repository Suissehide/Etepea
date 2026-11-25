import { byGapThenDate, gapRank } from '../../../main/utils/slot-gap'

const le = (jour: string, debut: string, fin: string) => ({
  startDate: new Date(`2027-01-${jour}T${debut}:00`),
  endDate: new Date(`2027-01-${jour}T${fin}:00`),
})

describe('gapRank', () => {
  const seance = le('05', '09:45', '11:00')

  it("classe en trou un créneau de l'après-midi après une séance du matin", () => {
    expect(gapRank(le('05', '13:30', '14:15'), [seance])).toBe(3)
  })

  it('classe collé un créneau qui suit la séance', () => {
    expect(gapRank(le('05', '11:00', '11:45'), [seance])).toBe(1)
  })

  it('classe collé un créneau qui précède la séance', () => {
    expect(gapRank(le('05', '08:30', '09:15'), [seance])).toBe(1)
  })

  it('accepte exactement une heure', () => {
    expect(gapRank(le('05', '12:00', '12:30'), [seance])).toBe(1)
  })

  it("refuse plus d'une heure dans la même demi-journée", () => {
    expect(gapRank(le('05', '12:15', '12:45'), [seance])).toBe(3)
  })

  it('refuse deux demi-journées même à 30 minutes', () => {
    expect(
      gapRank(le('05', '13:15', '13:45'), [le('05', '12:00', '12:45')]),
    ).toBe(3)
  })

  it('classe jour libre sans rendez-vous ce jour-là', () => {
    expect(gapRank(le('05', '13:30', '14:15'), [])).toBe(2)
    expect(
      gapRank(le('05', '13:30', '14:15'), [le('04', '13:45', '15:00')]),
    ).toBe(2)
  })

  it('retient collé dès qu’un rendez-vous du jour colle', () => {
    expect(
      gapRank(le('05', '13:30', '14:15'), [seance, le('05', '14:15', '15:00')]),
    ).toBe(1)
  })
})

describe('byGapThenDate', () => {
  it('trie par rang puis par date', () => {
    const a = { ...le('05', '13:30', '14:15'), rank: 3 }
    const b = { ...le('07', '11:00', '11:45'), rank: 1 }
    const c = { ...le('06', '11:00', '11:45'), rank: 1 }
    expect([a, b, c].sort(byGapThenDate)).toEqual([c, b, a])
  })
})
