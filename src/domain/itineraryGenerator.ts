import type { RouteStop, TripDay } from '../types/trip'
import { validateStopDateCoverage } from './dateAllocation'
import { enumerateDates } from './dateUtils'

export function itineraryDayId(stopId: string, date: string): string {
  return `day:${stopId}:${date}`
}

export function generateItinerary(
  stops: readonly RouteStop[],
  tripStartDate: string,
  tripEndDate: string,
  existingDays: readonly TripDay[] = [],
): TripDay[] {
  const errors = validateStopDateCoverage(stops, tripStartDate, tripEndDate)
  if (errors.length > 0) throw new RangeError(errors.join('. '))

  const existingByAssignment = new Map(
    existingDays.map((day) => [`${day.routeStopId}:${day.date}`, day]),
  )
  let dayNumber = 1

  return [...stops]
    .sort((left, right) => left.order - right.order)
    .flatMap((stop) => enumerateDates(stop.startDate, stop.endDate).map((date) => {
      const existing = existingByAssignment.get(`${stop.id}:${date}`)
      return {
        id: existing?.id ?? itineraryDayId(stop.id, date),
        routeStopId: stop.id,
        date,
        dayNumber: dayNumber++,
        notes: existing?.notes,
        isLeisure: existing?.isLeisure ?? false,
      }
    }))
}
