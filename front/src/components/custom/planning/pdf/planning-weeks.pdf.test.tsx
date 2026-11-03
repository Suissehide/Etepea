// @vitest-environment node
import { renderToBuffer } from '@react-pdf/renderer'
import dayjs from 'dayjs'
import isoWeek from 'dayjs/plugin/isoWeek'
import utc from 'dayjs/plugin/utc'
import { expect, it } from 'vitest'

import { buildPlanningWeeks } from './planning-pdf.utils.ts'
import PlanningWeeksPDF from './planning-weeks.pdf.tsx'

dayjs.extend(utc)
dayjs.extend(isoWeek)

const slot = {
  id: 'a',
  startDate: '2026-11-10T08:00:00.000Z',
  endDate: '2026-11-10T10:00:00.000Z',
  thematic: { name: 'Gym' },
  pathway: null,
  soignants: [],
  location: null,
} as never

it('garde les créneaux d’une semaine interdite sur sa page', async () => {
  const weeks = buildPlanningWeeks([slot], dayjs.utc('2026-11-09'), 1, [
    '2026-11-09',
  ])
  const pdf = (await renderToBuffer(<PlanningWeeksPDF weeks={weeks} />))
    .toString('latin1')
    .match(/\/Type \/Page\b/g)
  expect(pdf).toHaveLength(1)
})
