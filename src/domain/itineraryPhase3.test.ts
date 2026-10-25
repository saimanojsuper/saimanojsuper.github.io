import { describe, expect, it } from 'vitest'
import { createValidPlan } from '../test/fixtures'
import type { Activity } from '../types/trip'
import { updateTripDay } from './itineraryMutations'
import { conflictingActivityIds, findTimeConflicts } from './timeConflicts'

function timedActivity(id: string, dayId: string, startTime?: string, endTime?: string): Activity {
  return {
    id,
    dayId,
    routeStopId: 'stop-delhi',
    title: id,
    slot: 'morning',
    startTime,
    endTime,
    category: 'sightseeing',
    status: 'planned',
    order: 0,
  }
}

describe('updateTripDay', () => {
  it('updates notes and leisure state, trims notes, and leaves other days untouched', () => {
    const plan = createValidPlan()
    const result = updateTripDay(plan, 'day-1', { notes: '  Train tickets booked  ', isLeisure: true }, '2026-10-25T12:00:00Z')

    expect(result.days[0]).toMatchObject({ notes: 'Train tickets booked', isLeisure: true })
    expect(result.days[1]).toEqual(plan.days[1])
    expect(result.metadata.updatedAt).toBe('2026-10-25T12:00:00Z')
    expect(plan.days[0]?.notes).toBeUndefined()
  })

  it('removes blank notes and rejects an unknown day', () => {
    const plan = createValidPlan()
    plan.days[0] = { ...plan.days[0]!, notes: 'Old note' }

    expect(updateTripDay(plan, 'day-1', { notes: '   ', isLeisure: false }, '2026-10-25T12:00:00Z').days[0]?.notes).toBeUndefined()
    expect(() => updateTripDay(plan, 'missing', { notes: 'x', isLeisure: false }, '2026-10-25T12:00:00Z')).toThrow('Itinerary day does not exist')
  })
})

describe('exact-time conflicts', () => {
  it('reports exact overlap duration and both conflicting IDs', () => {
    const activities = [
      timedActivity('museum', 'day-1', '09:00', '11:30'),
      timedActivity('tour', 'day-1', '10:45', '12:00'),
    ]

    expect(findTimeConflicts(activities)).toEqual([
      { firstActivityId: 'museum', secondActivityId: 'tour', overlapMinutes: 45 },
    ])
    expect(conflictingActivityIds(activities)).toEqual(new Set(['museum', 'tour']))
  })

  it('does not flag touching boundaries, different days, or activities missing an endpoint', () => {
    const activities = [
      timedActivity('first', 'day-1', '09:00', '10:00'),
      timedActivity('touching', 'day-1', '10:00', '11:00'),
      timedActivity('other-day', 'day-2', '09:30', '10:30'),
      timedActivity('start-only', 'day-1', '09:30'),
      timedActivity('end-only', 'day-1', undefined, '10:30'),
    ]

    expect(findTimeConflicts(activities)).toEqual([])
    expect(conflictingActivityIds(activities).size).toBe(0)
  })

  it('finds contained and cross-slot overlaps because clock time, not slot label, is authoritative', () => {
    const outer = timedActivity('outer', 'day-1', '08:00', '12:00')
    const inner = { ...timedActivity('inner', 'day-1', '09:15', '09:45'), slot: 'evening' as const }

    expect(findTimeConflicts([outer, inner])).toEqual([
      { firstActivityId: 'outer', secondActivityId: 'inner', overlapMinutes: 30 },
    ])
  })
})
