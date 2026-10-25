import { describe, expect, it } from 'vitest'
import { createValidPlan } from '../test/fixtures'
import type { Activity } from '../types/trip'
import {
  addActivity,
  deleteActivity,
  duplicateActivity,
  moveActivity,
  normalizeActivityOrder,
  updateActivity,
} from './activityMutations'

const UPDATED_AT = '2026-10-25T12:00:00Z'

function activity(id: string, dayId = 'day-1', slot: Activity['slot'] = 'morning', order = 99): Activity {
  return {
    id,
    dayId,
    routeStopId: 'deliberately-wrong',
    title: id,
    slot,
    category: 'sightseeing',
    status: 'planned',
    order,
  }
}

function groupOrders(activities: Activity[], dayId: string, slot: Activity['slot']) {
  return activities
    .filter((item) => item.dayId === dayId && item.slot === slot)
    .map((item) => [item.id, item.order])
}

describe('activity mutations', () => {
  it('normalizes order independently within every day and slot without reordering records', () => {
    const input = [
      activity('a', 'day-1', 'morning', 8),
      activity('b', 'day-1', 'evening', 4),
      activity('c', 'day-1', 'morning', 2),
      activity('d', 'day-2', 'morning', 7),
    ]

    const result = normalizeActivityOrder(input)

    expect(result.map((item) => item.id)).toEqual(['a', 'b', 'c', 'd'])
    expect(result.map((item) => item.order)).toEqual([0, 0, 1, 0])
    expect(input.map((item) => item.order)).toEqual([8, 4, 2, 7])
  })

  it('adds an activity with its day stop, then edits content and status immutably', () => {
    const original = createValidPlan()
    const added = addActivity(original, activity('activity-2', 'day-3'), UPDATED_AT)

    expect(added.activities.at(-1)).toMatchObject({
      id: 'activity-2',
      dayId: 'day-3',
      routeStopId: 'stop-agra',
      order: 0,
    })
    expect(added.metadata.updatedAt).toBe(UPDATED_AT)
    expect(original.activities).toHaveLength(1)

    const changed = updateActivity(added, {
      ...added.activities.at(-1)!,
      title: 'Agra Fort',
      status: 'done',
      dayId: 'day-2',
      routeStopId: 'still-wrong',
      slot: 'afternoon',
    }, '2026-10-25T13:00:00Z')

    expect(changed.activities.find((item) => item.id === 'activity-2')).toMatchObject({
      title: 'Agra Fort',
      status: 'done',
      dayId: 'day-2',
      routeStopId: 'stop-delhi',
      slot: 'afternoon',
      order: 0,
    })
    expect(added.activities.at(-1)?.status).toBe('planned')
  })

  it('duplicates immediately after its source, resets status, and normalizes the group', () => {
    const plan = createValidPlan()
    plan.activities = [
      { ...activity('first'), routeStopId: 'stop-delhi', status: 'done', order: 0 },
      { ...activity('second'), routeStopId: 'stop-delhi', order: 1 },
    ]

    const result = duplicateActivity(plan, 'first', 'copy', UPDATED_AT)

    expect(result.activities.map((item) => item.id)).toEqual(['first', 'copy', 'second'])
    expect(result.activities[1]).toMatchObject({ title: 'first (copy)', status: 'planned', order: 1 })
    expect(groupOrders(result.activities, 'day-1', 'morning')).toEqual([
      ['first', 0], ['copy', 1], ['second', 2],
    ])
  })

  it('deletes an activity and closes ordering gaps', () => {
    const plan = createValidPlan()
    plan.activities = [
      { ...activity('first'), routeStopId: 'stop-delhi', order: 0 },
      { ...activity('middle'), routeStopId: 'stop-delhi', order: 1 },
      { ...activity('last'), routeStopId: 'stop-delhi', order: 2 },
    ]

    const result = deleteActivity(plan, 'middle', UPDATED_AT)

    expect(groupOrders(result.activities, 'day-1', 'morning')).toEqual([['first', 0], ['last', 1]])
  })

  it('rejects duplicate IDs and mutations of missing activities or days', () => {
    const plan = createValidPlan()

    expect(() => addActivity(plan, activity('activity-1'), UPDATED_AT)).toThrow('Activity ID already exists')
    expect(() => addActivity(plan, activity('new', 'missing-day'), UPDATED_AT)).toThrow('Unknown itinerary day')
    expect(() => updateActivity(plan, activity('missing'), UPDATED_AT)).toThrow('Activity does not exist')
    expect(() => deleteActivity(plan, 'missing', UPDATED_AT)).toThrow('Activity does not exist')
    expect(() => duplicateActivity(plan, 'missing', 'copy', UPDATED_AT)).toThrow('Activity does not exist')
  })
})

describe('moveActivity', () => {
  it('moves across days and slots while updating every assignment field and both group orders', () => {
    const plan = createValidPlan()
    plan.activities = [
      { ...activity('source'), routeStopId: 'stop-delhi', order: 0 },
      { ...activity('old-peer'), routeStopId: 'stop-delhi', order: 1 },
      { ...activity('target-a', 'day-3', 'evening'), routeStopId: 'stop-agra', order: 0 },
      { ...activity('target-b', 'day-3', 'evening'), routeStopId: 'stop-agra', order: 1 },
    ]

    const result = moveActivity(plan, 'source', 'day-3', 'evening', 1, UPDATED_AT)
    const moved = result.activities.find((item) => item.id === 'source')

    expect(moved).toMatchObject({
      dayId: 'day-3', routeStopId: 'stop-agra', slot: 'evening', order: 1,
    })
    expect(groupOrders(result.activities, 'day-1', 'morning')).toEqual([['old-peer', 0]])
    expect(groupOrders(result.activities, 'day-3', 'evening')).toEqual([
      ['target-a', 0], ['source', 1], ['target-b', 2],
    ])
  })

  it('bounds target indices and preserves normalized ordering for same-slot moves', () => {
    const plan = createValidPlan()
    plan.activities = ['a', 'b', 'c'].map((id, order) => ({
      ...activity(id), routeStopId: 'stop-delhi', order,
    }))

    const movedToEnd = moveActivity(plan, 'a', 'day-1', 'morning', 99, UPDATED_AT)
    expect(groupOrders(movedToEnd.activities, 'day-1', 'morning')).toEqual([
      ['b', 0], ['c', 1], ['a', 2],
    ])

    const movedToStart = moveActivity(movedToEnd, 'a', 'day-1', 'morning', -5, UPDATED_AT)
    expect(groupOrders(movedToStart.activities, 'day-1', 'morning')).toEqual([
      ['a', 0], ['b', 1], ['c', 2],
    ])
  })
})
