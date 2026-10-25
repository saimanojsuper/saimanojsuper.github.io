import type { TripDay, TripPlan } from '../types/trip'

export type TripDayUpdate = Pick<TripDay, 'notes' | 'isLeisure'>

export function updateTripDay(
  plan: TripPlan,
  dayId: string,
  update: TripDayUpdate,
  updatedAt: string,
): TripPlan {
  if (!plan.days.some((day) => day.id === dayId)) throw new Error('Itinerary day does not exist')
  return {
    ...plan,
    metadata: { ...plan.metadata, updatedAt },
    days: plan.days.map((day) => day.id === dayId ? {
      ...day,
      notes: update.notes?.trim() || undefined,
      isLeisure: update.isLeisure,
    } : day),
  }
}
