import type { DayResolutionSelections, DayAssignmentChange } from './dateChangeResolver'
import { applyDayResolutions, findRequiredDayChanges } from './dateChangeResolver'
import { allocateStopDates, scheduleStopsByDuration, validateStopDateCoverage } from './dateAllocation'
import { generateItinerary } from './itineraryGenerator'
import type { RouteStop, TravelLeg, TripPlan } from '../types/trip'

export type IdFactory = () => string

export interface RouteChangeDraft {
  routeStops: RouteStop[]
  requiredDayChanges: DayAssignmentChange[]
  finalize(selections?: DayResolutionSelections): TripPlan
}

function rebuildTravelLegs(plan: TripPlan, stops: readonly RouteStop[], createId: IdFactory): TravelLeg[] {
  const existing = new Map(plan.travelLegs.map((leg) => [`${leg.fromStopId}:${leg.toStopId}`, leg]))
  return stops.slice(0, -1).map((stop, order) => {
    const next = stops[order + 1]!
    const retained = existing.get(`${stop.id}:${next.id}`)
    return retained ? { ...retained, order } : {
      id: createId(),
      fromStopId: stop.id,
      toStopId: next.id,
      order,
    }
  })
}

export function prepareRouteChange(
  plan: TripPlan,
  routeStops: RouteStop[],
  updatedAt: string,
  createId: IdFactory,
): RouteChangeDraft {
  const errors = validateStopDateCoverage(routeStops, plan.metadata.startDate, plan.metadata.endDate)
  if (errors.length > 0) throw new Error(errors.join('. '))
  const days = generateItinerary(routeStops, plan.metadata.startDate, plan.metadata.endDate, plan.days)
  const travelLegs = rebuildTravelLegs(plan, routeStops, createId)
  const requiredDayChanges = findRequiredDayChanges(plan, days)

  return {
    routeStops,
    requiredDayChanges,
    finalize(selections = {}) {
      const resolved = applyDayResolutions(plan, days, selections)
      return {
        ...resolved,
        metadata: { ...resolved.metadata, updatedAt },
        routeStops,
        travelLegs,
      }
    },
  }
}

export function addRouteStop(
  plan: TripPlan,
  stop: Pick<RouteStop, 'id' | 'city'>,
  updatedAt: string,
  createId: IdFactory,
): RouteChangeDraft {
  const routeStops = allocateStopDates([...plan.routeStops, stop], plan.metadata.startDate, plan.metadata.endDate)
  return prepareRouteChange(plan, routeStops, updatedAt, createId)
}

export function reorderRouteStops(
  plan: TripPlan,
  orderedStopIds: readonly string[],
  updatedAt: string,
  createId: IdFactory,
): RouteChangeDraft {
  if (orderedStopIds.length !== plan.routeStops.length || new Set(orderedStopIds).size !== orderedStopIds.length) {
    throw new Error('Reordered stops must include every route stop exactly once')
  }
  const byId = new Map(plan.routeStops.map((stop) => [stop.id, stop]))
  const ordered = orderedStopIds.map((id) => {
    const stop = byId.get(id)
    if (!stop) throw new Error(`Unknown route stop: ${id}`)
    return stop
  })
  const routeStops = scheduleStopsByDuration(ordered, plan.metadata.startDate, plan.metadata.endDate)
  return prepareRouteChange(plan, routeStops, updatedAt, createId)
}

export function editRouteStops(
  plan: TripPlan,
  routeStops: RouteStop[],
  updatedAt: string,
  createId: IdFactory,
): RouteChangeDraft {
  const currentIds = new Set(plan.routeStops.map((stop) => stop.id))
  if (routeStops.length !== currentIds.size || routeStops.some((stop) => !currentIds.has(stop.id))) {
    throw new Error('Manual route edits must retain every stop; use add or delete for structural changes')
  }
  return prepareRouteChange(plan, routeStops, updatedAt, createId)
}

export function deleteRouteStop(
  plan: TripPlan,
  stopId: string,
  updatedAt: string,
  createId: IdFactory,
): RouteChangeDraft {
  if (!plan.routeStops.some((stop) => stop.id === stopId)) throw new Error('Route stop does not exist')
  const remaining = plan.routeStops.filter((stop) => stop.id !== stopId)
  if (remaining.length === 0) throw new Error('A trip must keep at least one route stop')

  const cleaned: TripPlan = {
    ...plan,
    activities: plan.activities.filter((record) => record.routeStopId !== stopId),
    foodEntries: plan.foodEntries.filter((record) => record.routeStopId !== stopId),
    arrivalDepartureEvents: plan.arrivalDepartureEvents.filter((record) => record.routeStopId !== stopId),
  }
  const routeStops = allocateStopDates(remaining, plan.metadata.startDate, plan.metadata.endDate)
  return prepareRouteChange(cleaned, routeStops, updatedAt, createId)
}
