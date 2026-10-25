import { describe, expect, it } from 'vitest'
import { createTripStore } from '../store/tripStore'
import {
  selectBudgetRemainingInr,
  selectRecordedActivityCostInr,
  selectRecordedFoodCostInr,
  selectRecordedTripCostInr,
} from '../store/selectors'
import { createValidPlan } from '../test/fixtures'
import type { Activity, FoodEntry } from '../types/trip'
import {
  calculateBudgetSnapshot,
  calculateRecordedActivityCostInr,
  calculateRecordedFoodCostInr,
  updateBudgetTarget,
} from './budget'

const UPDATED_AT = '2026-10-25T14:00:00Z'

function activity(costInr?: number, status: Activity['status'] = 'planned'): Activity {
  const base = createValidPlan().activities[0]!
  return { ...base, id: `activity-${status}-${costInr ?? 'missing'}`, costInr, status }
}

function food(estimatedCostInr?: number, status: FoodEntry['status'] = 'planned'): FoodEntry {
  const base = createValidPlan().foodEntries[0]!
  return { ...base, id: `food-${status}-${estimatedCostInr ?? 'missing'}`, estimatedCostInr, status }
}

describe('budget helpers', () => {
  it('totals activity costs across every status and treats zero or missing costs as zero', () => {
    expect(calculateRecordedActivityCostInr([
      activity(600, 'planned'),
      activity(400, 'done'),
      activity(250.5, 'skipped'),
      activity(0),
      activity(),
    ])).toBe(1_250.5)
    expect(calculateRecordedActivityCostInr([])).toBe(0)
  })

  it('totals food estimates across every status and treats zero or missing costs as zero', () => {
    expect(calculateRecordedFoodCostInr([
      food(250, 'planned'),
      food(500, 'done'),
      food(125.5, 'skipped'),
      food(0),
      food(),
    ])).toBe(875.5)
    expect(calculateRecordedFoodCostInr([])).toBe(0)
  })

  it.each([
    { name: 'food-only', activities: [activity()], foods: [food(900)], activityTotal: 0, foodTotal: 900, combined: 900 },
    { name: 'activity-only', activities: [activity(700)], foods: [food()], activityTotal: 700, foodTotal: 0, combined: 700 },
    { name: 'combined', activities: [activity(700)], foods: [food(900)], activityTotal: 700, foodTotal: 900, combined: 1_600 },
    { name: 'zero and missing', activities: [activity(0), activity()], foods: [food(0), food()], activityTotal: 0, foodTotal: 0, combined: 0 },
  ])('builds a $name snapshot', ({ activities, foods, activityTotal, foodTotal, combined }) => {
    const plan = { ...createValidPlan(), activities, foodEntries: foods }
    expect(calculateBudgetSnapshot(plan)).toMatchObject({
      recordedActivityCostInr: activityTotal,
      recordedFoodCostInr: foodTotal,
      recordedTotalCostInr: combined,
    })
  })

  it('calculates remaining and over-budget values from the combined total', () => {
    const plan = {
      ...createValidPlan(),
      activities: [activity(600)],
      foodEntries: [food(250)],
      budget: { currency: 'INR' as const, targetInr: 1_000 },
    }
    expect(calculateBudgetSnapshot(plan)).toEqual({
      targetInr: 1_000,
      recordedActivityCostInr: 600,
      recordedFoodCostInr: 250,
      recordedTotalCostInr: 850,
      remainingInr: 150,
      isOverBudget: false,
    })

    expect(calculateBudgetSnapshot({ ...plan, budget: { currency: 'INR', targetInr: 800 } })).toMatchObject({
      remainingInr: -50,
      isOverBudget: true,
    })
    expect(calculateBudgetSnapshot({ ...plan, budget: { currency: 'INR', targetInr: 0 } })).toMatchObject({
      targetInr: 0,
      remainingInr: -850,
      isOverBudget: true,
    })
    expect(calculateBudgetSnapshot({ ...plan, budget: { currency: 'INR' } })).toMatchObject({
      targetInr: null,
      remainingInr: null,
      isOverBudget: false,
    })
  })

  it('updates or clears the target immutably and timestamps the plan', () => {
    const plan = createValidPlan()
    const snapshot = structuredClone(plan)
    const updated = updateBudgetTarget(plan, 12_345, UPDATED_AT)
    expect(updated.budget).toEqual({ currency: 'INR', targetInr: 12_345 })
    expect(updated.metadata.updatedAt).toBe(UPDATED_AT)
    expect(plan).toEqual(snapshot)

    expect(updateBudgetTarget(plan, undefined, UPDATED_AT).budget).toEqual({ currency: 'INR', targetInr: undefined })
  })

  it.each([-1, Number.NaN, Number.POSITIVE_INFINITY])('rejects invalid target %s', (target) => {
    expect(() => updateBudgetTarget(createValidPlan(), target, UPDATED_AT)).toThrow(
      'Budget target must be a nonnegative INR value',
    )
  })
})

describe('budget selectors', () => {
  it.each([
    { name: 'food-only', activities: [activity()], foods: [food(900)], activityTotal: 0, foodTotal: 900, combined: 900 },
    { name: 'activity-only', activities: [activity(700)], foods: [food()], activityTotal: 700, foodTotal: 0, combined: 700 },
    { name: 'combined across statuses', activities: [activity(700, 'skipped')], foods: [food(900, 'done')], activityTotal: 700, foodTotal: 900, combined: 1_600 },
    { name: 'zero and missing', activities: [activity(0), activity()], foods: [food(0), food()], activityTotal: 0, foodTotal: 0, combined: 0 },
  ])('selects $name costs and remaining budget', ({ activities, foods, activityTotal, foodTotal, combined }) => {
    const orderedActivities = activities.map((entry, order) => ({ ...entry, order }))
    const plan = { ...createValidPlan(), activities: orderedActivities, foodEntries: foods, budget: { currency: 'INR' as const, targetInr: 2_000 } }
    const state = createTripStore({ initialPlan: plan }).getState()
    expect(selectRecordedActivityCostInr(state)).toBe(activityTotal)
    expect(selectRecordedFoodCostInr(state)).toBe(foodTotal)
    expect(selectRecordedTripCostInr(state)).toBe(combined)
    expect(selectBudgetRemainingInr(state)).toBe(2_000 - combined)
  })

  it('selects over-budget, zero-target, undefined-target, and empty-plan values', () => {
    const plan = { ...createValidPlan(), activities: [activity(600)], foodEntries: [food(250)] }
    const overState = createTripStore({ initialPlan: { ...plan, budget: { currency: 'INR', targetInr: 800 } } }).getState()
    expect(selectBudgetRemainingInr(overState)).toBe(-50)

    const zeroTargetState = createTripStore({ initialPlan: { ...plan, budget: { currency: 'INR', targetInr: 0 } } }).getState()
    expect(selectBudgetRemainingInr(zeroTargetState)).toBe(-850)

    const undefinedTargetState = createTripStore({ initialPlan: { ...plan, budget: { currency: 'INR' } } }).getState()
    expect(selectRecordedTripCostInr(undefinedTargetState)).toBe(850)
    expect(selectBudgetRemainingInr(undefinedTargetState)).toBeNull()

    const emptyState = createTripStore({ initialPlan: null }).getState()
    expect(selectRecordedActivityCostInr(emptyState)).toBe(0)
    expect(selectRecordedFoodCostInr(emptyState)).toBe(0)
    expect(selectRecordedTripCostInr(emptyState)).toBe(0)
    expect(selectBudgetRemainingInr(emptyState)).toBeNull()
  })
})
