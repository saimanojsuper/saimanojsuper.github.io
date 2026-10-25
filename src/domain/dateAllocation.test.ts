import { describe, expect, it } from 'vitest'
import {
  allocateStopDates,
  DateAllocationError,
  validateStopDateCoverage,
} from './dateAllocation'

const stops = [
  { id: 'stop-a', city: 'Alpha' },
  { id: 'stop-b', city: 'Beta' },
  { id: 'stop-c', city: 'Gamma' },
]

describe('date allocation', () => {
  it('allocates every trip date exactly once in contiguous route order', () => {
    const allocated = allocateStopDates(stops, '2026-06-01', '2026-06-07')

    expect(allocated).toEqual([
      { ...stops[0], startDate: '2026-06-01', endDate: '2026-06-03', order: 0 },
      { ...stops[1], startDate: '2026-06-04', endDate: '2026-06-05', order: 1 },
      { ...stops[2], startDate: '2026-06-06', endDate: '2026-06-07', order: 2 },
    ])
    expect(validateStopDateCoverage(allocated, '2026-06-01', '2026-06-07')).toEqual([])
  })

  it('rejects more stops than available trip days', () => {
    expect(() => allocateStopDates(stops, '2026-06-01', '2026-06-02'))
      .toThrow(new DateAllocationError('A 2-day trip cannot give at least one day to 3 stops'))
  })

  it('reports a manually introduced gap instead of accepting partial coverage', () => {
    const manualStops = [
      { id: 'stop-a', city: 'Alpha', startDate: '2026-06-01', endDate: '2026-06-02', order: 0 },
      { id: 'stop-b', city: 'Beta', startDate: '2026-06-04', endDate: '2026-06-05', order: 1 },
    ]

    expect(validateStopDateCoverage(manualStops, '2026-06-01', '2026-06-05')).toEqual(expect.arrayContaining([
      'Beta must start on 2026-06-03 to avoid a gap or overlap',
      'Every trip date must be assigned to exactly one route stop',
    ]))
  })
})
