import type { ArrivalDepartureEvent, TripPlan } from '../types/trip'
import { generateItinerary } from './itineraryGenerator'
import { isIsoDate } from './dateUtils'

function moveEventToDay(
  event: ArrivalDepartureEvent,
  date: string,
  routeStopId: string,
  dayId: string,
): ArrivalDepartureEvent {
  return {
    ...event,
    routeStopId,
    dayId,
    dateTime: `${date}${event.dateTime.slice(10)}`,
  }
}

export function extendTripEndDate(plan: TripPlan, newEndDate: string, updatedAt: string): TripPlan {
  if (!isIsoDate(newEndDate)) throw new Error('Choose a valid new trip end date')
  if (newEndDate <= plan.metadata.endDate) {
    throw new Error('The new end date must be later than the current trip end date; shrinking requires record resolution')
  }

  const orderedStops = [...plan.routeStops].sort((left, right) => left.order - right.order)
  const firstStop = orderedStops[0]
  const finalStop = orderedStops.at(-1)
  if (!firstStop || !finalStop) throw new Error('Trip needs at least one destination')
  const routeStops = orderedStops.map((stop) => stop.id === finalStop.id ? { ...stop, endDate: newEndDate } : stop)
  const days = generateItinerary(routeStops, plan.metadata.startDate, newEndDate, plan.days)
  const firstDay = days.find((day) => day.date === plan.metadata.startDate && day.routeStopId === firstStop.id)!
  const finalDay = days.find((day) => day.date === newEndDate && day.routeStopId === finalStop.id)!
  const arrivalDepartureEvents = plan.arrivalDepartureEvents.map((event) => {
    if (event.type === 'arrival') return moveEventToDay(event, plan.metadata.startDate, firstStop.id, firstDay.id)
    return moveEventToDay(event, newEndDate, finalStop.id, finalDay.id)
  })

  return {
    ...plan,
    metadata: { ...plan.metadata, endDate: newEndDate, updatedAt },
    routeStops,
    days,
    arrivalDepartureEvents,
  }
}

export function applyArrivalDepartureEvents(
  plan: TripPlan,
  events: ArrivalDepartureEvent[],
  updatedAt: string,
): TripPlan {
  const futureDepartureDates = events
    .filter((event) => event.type === 'departure')
    .map((event) => event.dateTime.slice(0, 10))
    .filter((date) => date > plan.metadata.endDate)
  const newEndDate = futureDepartureDates.sort().at(-1)
  const scheduledPlan = newEndDate ? extendTripEndDate(plan, newEndDate, updatedAt) : plan
  const orderedStops = [...scheduledPlan.routeStops].sort((left, right) => left.order - right.order)
  const firstStop = orderedStops[0]!
  const finalStop = orderedStops.at(-1)!

  const normalizedEvents = events.map((event) => {
    if (event.type === 'arrival') {
      const day = scheduledPlan.days.find((candidate) => candidate.date === scheduledPlan.metadata.startDate && candidate.routeStopId === firstStop.id)!
      return moveEventToDay(event, scheduledPlan.metadata.startDate, firstStop.id, day.id)
    }

    const eventDate = event.dateTime.slice(0, 10)
    const extendsTrip = eventDate > plan.metadata.endDate
    const routeStopId = extendsTrip ? finalStop.id : event.routeStopId
    const day = scheduledPlan.days.find((candidate) => candidate.date === eventDate && candidate.routeStopId === routeStopId)
    if (!day) throw new Error('Departure date must be inside its destination range or later than the trip end date')
    return moveEventToDay(event, eventDate, routeStopId, day.id)
  })

  return {
    ...scheduledPlan,
    metadata: { ...scheduledPlan.metadata, updatedAt },
    arrivalDepartureEvents: normalizedEvents,
  }
}
