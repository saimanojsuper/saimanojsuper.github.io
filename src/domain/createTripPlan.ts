import { CURRENT_SCHEMA_VERSION } from '../constants/schema'
import type { ArrivalDepartureType, TripPlan } from '../types/trip'
import { allocateStopDates, type RouteStopSeed } from './dateAllocation'
import { generateItinerary } from './itineraryGenerator'
import type { IdFactory } from './routeMutations'

export interface SetupEventInput {
  type: ArrivalDepartureType
  place: string
  dateTime: string
  mapsUrl?: string | undefined
  notes?: string | undefined
}

export interface TripSetupInput {
  title: string
  description?: string | undefined
  coverImageUrl?: string | undefined
  startDate: string
  endDate: string
  stops: RouteStopSeed[]
  arrival?: SetupEventInput | undefined
  departure?: SetupEventInput | undefined
}

export function createTripPlan(
  input: TripSetupInput,
  now: string,
  createId: IdFactory,
): TripPlan {
  const routeStops = allocateStopDates(input.stops, input.startDate, input.endDate)
  const days = generateItinerary(routeStops, input.startDate, input.endDate)
  const events = [input.arrival, input.departure].flatMap((event) => {
    if (!event) return []
    const routeStop = event.type === 'arrival' ? routeStops[0]! : routeStops.at(-1)!
    const day = days.find((candidate) => candidate.routeStopId === routeStop.id && candidate.date === event.dateTime.slice(0, 10))
    return [{
      id: createId(),
      routeStopId: routeStop.id,
      dayId: day?.id,
      ...event,
    }]
  })

  return {
    schemaVersion: CURRENT_SCHEMA_VERSION,
    metadata: {
      id: createId(),
      title: input.title.trim(),
      description: input.description?.trim() || undefined,
      coverImageUrl: input.coverImageUrl?.trim() || undefined,
      startDate: input.startDate,
      endDate: input.endDate,
      createdAt: now,
      updatedAt: now,
    },
    routeStops,
    travelLegs: routeStops.slice(0, -1).map((stop, order) => ({
      id: createId(),
      fromStopId: stop.id,
      toStopId: routeStops[order + 1]!.id,
      order,
    })),
    days,
    activities: [],
    foodEntries: [],
    arrivalDepartureEvents: events,
    budget: { currency: 'INR' },
  }
}
