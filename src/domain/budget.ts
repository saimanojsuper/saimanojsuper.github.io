import type { Activity, FoodEntry, TripPlan } from '../types/trip'

export interface BudgetSnapshot {
  targetInr: number | null
  recordedActivityCostInr: number
  recordedFoodCostInr: number
  recordedTotalCostInr: number
  remainingInr: number | null
  isOverBudget: boolean
}

export function calculateRecordedActivityCostInr(activities: readonly Activity[]): number {
  return activities.reduce((total, activity) => total + (activity.costInr ?? 0), 0)
}

export function calculateRecordedFoodCostInr(entries: readonly FoodEntry[]): number {
  return entries.reduce((total, entry) => total + (entry.estimatedCostInr ?? 0), 0)
}

export function calculateBudgetSnapshot(plan: TripPlan): BudgetSnapshot {
  const targetInr = plan.budget.targetInr ?? null
  const recordedActivityCostInr = calculateRecordedActivityCostInr(plan.activities)
  const recordedFoodCostInr = calculateRecordedFoodCostInr(plan.foodEntries)
  const recordedTotalCostInr = recordedActivityCostInr + recordedFoodCostInr
  const remainingInr = targetInr === null ? null : targetInr - recordedTotalCostInr
  return {
    targetInr,
    recordedActivityCostInr,
    recordedFoodCostInr,
    recordedTotalCostInr,
    remainingInr,
    isOverBudget: remainingInr !== null && remainingInr < 0,
  }
}

export function updateBudgetTarget(plan: TripPlan, targetInr: number | undefined, updatedAt: string): TripPlan {
  if (targetInr !== undefined && (!Number.isFinite(targetInr) || targetInr < 0)) {
    throw new Error('Budget target must be a nonnegative INR value')
  }
  return {
    ...plan,
    metadata: { ...plan.metadata, updatedAt },
    budget: { currency: 'INR', targetInr },
  }
}
