import type { RouteStop } from '../types/trip'
import { addDays, daysInclusive, enumerateDates } from './dateUtils'

export type RouteStopSeed = Pick<RouteStop, 'id' | 'city'>

export class DateAllocationError extends Error {
  constructor(message: string) {
    super(message)
    this.name = 'DateAllocationError'
  }
}

export function allocateStopDates(
  stops: readonly RouteStopSeed[],
  startDate: string,
  endDate: string,
): RouteStop[] {
  let tripDays: number
  try {
    tripDays = daysInclusive(startDate, endDate)
  } catch {
    throw new DateAllocationError('Trip dates must be valid and the end date cannot precede the start date')
  }
  if (stops.length === 0) throw new DateAllocationError('Add at least one route stop')
  if (stops.length > tripDays) {
    throw new DateAllocationError(`A ${tripDays}-day trip cannot give at least one day to ${stops.length} stops`)
  }

  const minimumDays = Math.floor(tripDays / stops.length)
  const extraDays = tripDays % stops.length
  let cursor = startDate

  return stops.map((stop, index) => {
    const duration = minimumDays + (index < extraDays ? 1 : 0)
    const allocated: RouteStop = {
      ...stop,
      startDate: cursor,
      endDate: addDays(cursor, duration - 1),
      order: index,
    }
    cursor = addDays(allocated.endDate, 1)
    return allocated
  })
}

export function scheduleStopsByDuration(
  stops: readonly RouteStop[],
  startDate: string,
  endDate: string,
): RouteStop[] {
  const availableDays = daysInclusive(startDate, endDate)
  const durations = stops.map((stop) => daysInclusive(stop.startDate, stop.endDate))
  if (durations.reduce((total, duration) => total + duration, 0) !== availableDays) {
    return allocateStopDates(stops, startDate, endDate)
  }

  let cursor = startDate
  return stops.map((stop, index) => {
    const duration = durations[index]!
    const scheduled = { ...stop, startDate: cursor, endDate: addDays(cursor, duration - 1), order: index }
    cursor = addDays(scheduled.endDate, 1)
    return scheduled
  })
}

export function validateStopDateCoverage(
  stops: readonly RouteStop[],
  startDate: string,
  endDate: string,
): string[] {
  try {
    daysInclusive(startDate, endDate)
  } catch {
    return ['Trip dates must form a valid range']
  }
  if (stops.length === 0) return ['Add at least one route stop']

  const errors: string[] = []
  const ordered = [...stops].sort((left, right) => left.order - right.order)
  let expectedStart = startDate

  ordered.forEach((stop, index) => {
    if (stop.order !== index) errors.push(`Route stop orders must be consecutive from 0`)
    if (stop.startDate !== expectedStart) {
      errors.push(`${stop.city} must start on ${expectedStart} to avoid a gap or overlap`)
    }
    try {
      daysInclusive(stop.startDate, stop.endDate)
      expectedStart = addDays(stop.endDate, 1)
    } catch {
      errors.push(`${stop.city} has an invalid date range`)
    }
  })

  if (expectedStart !== addDays(endDate, 1)) {
    errors.push(`The final stop must end on ${endDate}`)
  }

  const coveredDates = ordered.flatMap((stop) => {
    try { return enumerateDates(stop.startDate, stop.endDate) } catch { return [] }
  })
  const expectedDates = enumerateDates(startDate, endDate)
  if (coveredDates.length !== expectedDates.length || coveredDates.some((date, index) => date !== expectedDates[index])) {
    errors.push('Every trip date must be assigned to exactly one route stop')
  }

  return [...new Set(errors)]
}
