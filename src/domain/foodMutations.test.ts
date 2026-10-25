import { describe, expect, it } from 'vitest'
import { createValidPlan } from '../test/fixtures'
import type { FoodEntry } from '../types/trip'
import {
  addFoodEntry,
  deleteFoodEntry,
  duplicateFoodEntry,
  filterFoodEntries,
  foodEntriesForDay,
  updateFoodEntry,
} from './foodMutations'

const UPDATED_AT = '2026-10-25T12:34:56Z'

function delhiFood(overrides: Partial<FoodEntry> = {}): FoodEntry {
  return {
    id: 'food-delhi',
    routeStopId: 'stop-delhi',
    dayId: 'day-1',
    dish: 'Chole bhature',
    mealType: 'lunch',
    priority: 'high',
    status: 'planned',
    ...overrides,
  }
}

describe('food mutations', () => {
  it('adds, updates status, duplicates beside the source, and deletes immutably', () => {
    const original = createValidPlan()
    const snapshot = structuredClone(original)

    const added = addFoodEntry(original, delhiFood(), UPDATED_AT)
    expect(added).not.toBe(original)
    expect(added.foodEntries).not.toBe(original.foodEntries)
    expect(added.foodEntries.at(-1)).toEqual(delhiFood())
    expect(added.metadata).toEqual({ ...original.metadata, updatedAt: UPDATED_AT })
    expect(original).toEqual(snapshot)

    const statusAt = '2026-10-25T12:35:00Z'
    const updatedEntry = { ...added.foodEntries.at(-1)!, status: 'done' as const, notes: 'Worth the queue' }
    const updated = updateFoodEntry(added, updatedEntry, statusAt)
    expect(updated.foodEntries.at(-1)).toEqual(updatedEntry)
    expect(updated.foodEntries[0]).toBe(added.foodEntries[0])
    expect(updated.metadata.updatedAt).toBe(statusAt)
    expect(added.foodEntries.at(-1)?.status).toBe('planned')

    const duplicated = duplicateFoodEntry(updated, 'food-delhi', 'food-copy', UPDATED_AT)
    expect(duplicated.foodEntries.map((entry) => entry.id)).toEqual(['food-1', 'food-delhi', 'food-copy'])
    expect(duplicated.foodEntries[2]).toEqual({
      ...updatedEntry,
      id: 'food-copy',
      dish: 'Chole bhature (copy)',
      status: 'planned',
    })
    expect(updated.foodEntries).toHaveLength(2)

    const deleted = deleteFoodEntry(duplicated, 'food-delhi', UPDATED_AT)
    expect(deleted.foodEntries.map((entry) => entry.id)).toEqual(['food-1', 'food-copy'])
    expect(duplicated.foodEntries).toHaveLength(3)
    expect(deleted.metadata.updatedAt).toBe(UPDATED_AT)
  })

  it('rejects duplicate IDs, missing records, missing destinations/days, and cross-destination days', () => {
    const plan = createValidPlan()
    expect(() => addFoodEntry(plan, { ...delhiFood(), id: 'food-1' }, UPDATED_AT)).toThrow('Food entry ID already exists')
    expect(() => updateFoodEntry(plan, delhiFood(), UPDATED_AT)).toThrow('Food entry does not exist')
    expect(() => deleteFoodEntry(plan, 'missing', UPDATED_AT)).toThrow('Food entry does not exist')
    expect(() => duplicateFoodEntry(plan, 'missing', 'copy', UPDATED_AT)).toThrow('Food entry does not exist')
    expect(() => duplicateFoodEntry(plan, 'food-1', 'food-1', UPDATED_AT)).toThrow('Food entry ID already exists')
    expect(() => addFoodEntry(plan, delhiFood({ routeStopId: 'missing-stop', dayId: undefined }), UPDATED_AT)).toThrow('Food destination does not exist')
    expect(() => addFoodEntry(plan, delhiFood({ dayId: 'missing-day' }), UPDATED_AT)).toThrow('Food day does not exist')
    expect(() => addFoodEntry(plan, delhiFood({ dayId: 'day-3' }), UPDATED_AT)).toThrow('Food day must belong to its destination')
  })
})

describe('food filtering', () => {
  const plan = createValidPlan()
  const entries: FoodEntry[] = [
    delhiFood({ id: 'delhi-any', dayId: undefined, dish: 'Delhi-wide' }),
    delhiFood({ id: 'delhi-day-1', dayId: 'day-1', dish: 'Day one' }),
    delhiFood({ id: 'delhi-day-2', dayId: 'day-2', dish: 'Day two' }),
    plan.foodEntries[0]!,
  ]

  it('filters by destination, while no filters returns every entry', () => {
    expect(filterFoodEntries(entries, plan.days, {}).map((entry) => entry.id)).toEqual(entries.map((entry) => entry.id))
    expect(filterFoodEntries(entries, plan.days, { routeStopId: 'stop-delhi' }).map((entry) => entry.id)).toEqual([
      'delhi-any', 'delhi-day-1', 'delhi-day-2',
    ])
  })

  it('includes the selected day and destination-wide entries in day context', () => {
    expect(filterFoodEntries(entries, plan.days, { dayId: 'day-1' }).map((entry) => entry.id)).toEqual([
      'delhi-any', 'delhi-day-1',
    ])
    expect(foodEntriesForDay(entries, plan.days[0]!).map((entry) => entry.id)).toEqual([
      'delhi-any', 'delhi-day-1',
    ])
  })

  it('returns no entries for an unknown selected day rather than leaking unfiltered data', () => {
    expect(filterFoodEntries(entries, plan.days, { dayId: 'missing-day' })).toEqual([])
  })
})
