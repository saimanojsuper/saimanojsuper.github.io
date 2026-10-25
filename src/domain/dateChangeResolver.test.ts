import { describe, expect, it } from 'vitest'
import { createValidPlan } from '../test/fixtures'
import type { TripDay } from '../types/trip'
import {
  applyDayResolutions,
  findRequiredDayChanges,
  resolutionKey,
} from './dateChangeResolver'

const changedDays: TripDay[] = [
  { id: 'day-1', routeStopId: 'stop-delhi', date: '2026-11-01', dayNumber: 1, isLeisure: false },
  { id: 'agra-new-day', routeStopId: 'stop-agra', date: '2026-11-02', dayNumber: 2, isLeisure: false },
  { id: 'day-3', routeStopId: 'stop-agra', date: '2026-11-03', dayNumber: 3, isLeisure: false },
]

describe('date change resolution', () => {
  it('selects only day-linked records whose assignment disappeared or changed stop', () => {
    const plan = createValidPlan()
    plan.activities.push({
      ...plan.activities[0]!,
      id: 'activity-2',
      title: 'Evening walk',
      dayId: 'day-2',
    })

    const changes = findRequiredDayChanges(plan, changedDays)

    expect(changes).toHaveLength(1)
    expect(changes[0]).toMatchObject({
      recordType: 'activity',
      recordId: 'activity-2',
      label: 'Evening walk',
      previousDayId: 'day-2',
      routeStopId: 'stop-delhi',
    })
    expect(changes[0]?.candidateDays.map((day) => day.id)).toEqual(['day-1'])
  })

  it('applies the chosen replacement while preserving unaffected linked records', () => {
    const plan = createValidPlan()
    plan.activities.push({
      ...plan.activities[0]!,
      id: 'activity-2',
      title: 'Evening walk',
      dayId: 'day-2',
    })
    const [change] = findRequiredDayChanges(plan, changedDays)

    const resolved = applyDayResolutions(plan, changedDays, {
      [resolutionKey(change!)]: 'day-1',
    })

    expect(resolved.days).toEqual(changedDays)
    expect(resolved.activities.find((activity) => activity.id === 'activity-2')?.dayId).toBe('day-1')
    expect(resolved.activities.find((activity) => activity.id === 'activity-1')?.dayId).toBe('day-1')
    expect(resolved.foodEntries[0]?.dayId).toBe('day-3')
    expect(resolved.arrivalDepartureEvents[0]?.dayId).toBe('day-3')
  })

  it('rejects a replacement day belonging to a different route stop', () => {
    const plan = createValidPlan()
    plan.activities[0] = { ...plan.activities[0]!, dayId: 'removed-day' }
    const [change] = findRequiredDayChanges(plan, changedDays)

    expect(() => applyDayResolutions(plan, changedDays, {
      [resolutionKey(change!)]: 'agra-new-day',
    })).toThrow('Choose a replacement day for: See Humayun’s Tomb')
  })
})
