import { describe, expect, it } from 'vitest'
import { createValidPlan } from '../test/fixtures'
import { resolutionKey } from './dateChangeResolver'
import { deleteRouteStop, reorderRouteStops } from './routeMutations'

function sequentialIds(prefix = 'generated') {
  let next = 0
  return () => `${prefix}-${++next}`
}

describe('route mutations', () => {
  it('reorders stops, rebuilds route links, resolves displaced records, and updates metadata', () => {
    const plan = createValidPlan()
    const updatedAt = '2026-10-25T09:30:00Z'

    const draft = reorderRouteStops(
      plan,
      ['stop-agra', 'stop-delhi'],
      updatedAt,
      sequentialIds(),
    )

    expect(draft.routeStops).toEqual([
      { id: 'stop-agra', city: 'Agra', startDate: '2026-11-01', endDate: '2026-11-01', order: 0 },
      { id: 'stop-delhi', city: 'Delhi', startDate: '2026-11-02', endDate: '2026-11-03', order: 1 },
    ])
    expect(draft.requiredDayChanges.map((change) => [change.recordType, change.recordId])).toEqual([
      ['activity', 'activity-1'],
      ['foodEntry', 'food-1'],
      ['arrivalDepartureEvent', 'event-1'],
    ])

    const selections = Object.fromEntries(draft.requiredDayChanges.map((change) => [
      resolutionKey(change),
      change.candidateDays[0]!.id,
    ]))
    const result = draft.finalize(selections)

    expect(result.metadata.updatedAt).toBe(updatedAt)
    expect(result.routeStops).toEqual(draft.routeStops)
    expect(result.travelLegs).toEqual([{
      id: 'generated-1',
      fromStopId: 'stop-agra',
      toStopId: 'stop-delhi',
      order: 0,
    }])
    expect(result.activities[0]?.dayId).toBe('day-2')
    expect(result.foodEntries[0]?.dayId).toBe('day:stop-agra:2026-11-01')
    expect(result.arrivalDepartureEvents[0]).toMatchObject({
      dayId: 'day:stop-agra:2026-11-01',
      dateTime: '2026-11-01T09:15:00+05:30',
    })
  })

  it('deletes all records owned by a removed stop and updates metadata', () => {
    const plan = createValidPlan()
    const updatedAt = '2026-10-25T10:00:00Z'

    const result = deleteRouteStop(
      plan,
      'stop-agra',
      updatedAt,
      sequentialIds(),
    ).finalize()

    expect(result.metadata.updatedAt).toBe(updatedAt)
    expect(result.routeStops).toEqual([{
      id: 'stop-delhi',
      city: 'Delhi',
      startDate: '2026-11-01',
      endDate: '2026-11-03',
      order: 0,
    }])
    expect(result.travelLegs).toEqual([])
    expect(result.activities.map((activity) => activity.id)).toEqual(['activity-1'])
    expect(result.foodEntries).toEqual([])
    expect(result.arrivalDepartureEvents).toEqual([])
  })
})
