import type { FoodEntry, TripDay, TripPlan } from '../types/trip'

export interface FoodFilters {
  routeStopId?: string | undefined
  dayId?: string | undefined
}

function validateReference(plan: TripPlan, entry: FoodEntry): void {
  if (!plan.routeStops.some((stop) => stop.id === entry.routeStopId)) throw new Error('Food destination does not exist')
  if (!entry.dayId) return
  const day = plan.days.find((candidate) => candidate.id === entry.dayId)
  if (!day) throw new Error('Food day does not exist')
  if (day.routeStopId !== entry.routeStopId) throw new Error('Food day must belong to its destination')
}

function touch(plan: TripPlan, foodEntries: FoodEntry[], updatedAt: string): TripPlan {
  return { ...plan, metadata: { ...plan.metadata, updatedAt }, foodEntries }
}

export function addFoodEntry(plan: TripPlan, entry: FoodEntry, updatedAt: string): TripPlan {
  if (plan.foodEntries.some((candidate) => candidate.id === entry.id)) throw new Error('Food entry ID already exists')
  validateReference(plan, entry)
  return touch(plan, [...plan.foodEntries, entry], updatedAt)
}

export function updateFoodEntry(plan: TripPlan, entry: FoodEntry, updatedAt: string): TripPlan {
  if (!plan.foodEntries.some((candidate) => candidate.id === entry.id)) throw new Error('Food entry does not exist')
  validateReference(plan, entry)
  return touch(plan, plan.foodEntries.map((candidate) => candidate.id === entry.id ? entry : candidate), updatedAt)
}

export function deleteFoodEntry(plan: TripPlan, entryId: string, updatedAt: string): TripPlan {
  if (!plan.foodEntries.some((candidate) => candidate.id === entryId)) throw new Error('Food entry does not exist')
  return touch(plan, plan.foodEntries.filter((candidate) => candidate.id !== entryId), updatedAt)
}

export function duplicateFoodEntry(plan: TripPlan, entryId: string, duplicateId: string, updatedAt: string): TripPlan {
  if (plan.foodEntries.some((candidate) => candidate.id === duplicateId)) throw new Error('Food entry ID already exists')
  const sourceIndex = plan.foodEntries.findIndex((candidate) => candidate.id === entryId)
  if (sourceIndex < 0) throw new Error('Food entry does not exist')
  const duplicate: FoodEntry = {
    ...plan.foodEntries[sourceIndex]!,
    id: duplicateId,
    dish: `${plan.foodEntries[sourceIndex]!.dish} (copy)`,
    status: 'planned',
  }
  const foodEntries = [...plan.foodEntries]
  foodEntries.splice(sourceIndex + 1, 0, duplicate)
  return touch(plan, foodEntries, updatedAt)
}

export function filterFoodEntries(
  entries: readonly FoodEntry[],
  days: readonly TripDay[],
  filters: FoodFilters,
): FoodEntry[] {
  const selectedDay = filters.dayId ? days.find((day) => day.id === filters.dayId) : undefined
  return entries.filter((entry) => {
    if (filters.routeStopId && entry.routeStopId !== filters.routeStopId) return false
    if (!selectedDay) return !filters.dayId
    return entry.dayId === selectedDay.id || (!entry.dayId && entry.routeStopId === selectedDay.routeStopId)
  })
}

export function foodEntriesForDay(entries: readonly FoodEntry[], day: TripDay): FoodEntry[] {
  return entries.filter((entry) => entry.dayId === day.id || (!entry.dayId && entry.routeStopId === day.routeStopId))
}
