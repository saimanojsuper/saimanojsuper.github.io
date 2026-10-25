import { z } from 'zod'
import { CURRENT_SCHEMA_VERSION } from '../constants/schema'
import { validateStopDateCoverage } from '../domain/dateAllocation'
import { enumerateDates, isIsoDate } from '../domain/dateUtils'
import {
  ACTIVITY_CATEGORIES,
  ACTIVITY_SLOTS,
  ARRIVAL_DEPARTURE_TYPES,
  FOOD_PRIORITIES,
  ITEM_STATUSES,
  MEAL_TYPES,
  TRANSPORT_MODES,
  type TripPlan,
} from '../types/trip'

const idSchema = z.string().trim().min(1, 'ID is required').max(128)
const requiredText = z.string().trim().min(1).max(500)
const notesSchema = z.string().trim().max(10_000)
const isoDateSchema = z.string().date('Expected an ISO date (YYYY-MM-DD)')
const isoDateTimeSchema = z.string().datetime({ offset: true, message: 'Expected an ISO 8601 date-time with timezone' })
const timeSchema = z.string().regex(/^([01]\d|2[0-3]):[0-5]\d$/, 'Expected a 24-hour time (HH:mm)')
const nonnegativeInrSchema = z.number().finite().nonnegative('INR value cannot be negative')
const nonnegativeOrderSchema = z.number().int().nonnegative()

const httpUrlSchema = z.string().url().refine((value) => {
  const protocol = new URL(value).protocol
  return protocol === 'http:' || protocol === 'https:'
}, 'Only http and https URLs are allowed')

export const tripMetadataSchema = z.object({
  id: idSchema,
  title: requiredText,
  description: notesSchema.optional(),
  coverImageUrl: httpUrlSchema.optional(),
  startDate: isoDateSchema,
  endDate: isoDateSchema,
  createdAt: isoDateTimeSchema,
  updatedAt: isoDateTimeSchema,
}).strict()

export const routeStopSchema = z.object({
  id: idSchema,
  city: requiredText,
  startDate: isoDateSchema,
  endDate: isoDateSchema,
  order: nonnegativeOrderSchema,
}).strict()

export const travelLegSchema = z.object({
  id: idSchema,
  fromStopId: idSchema,
  toStopId: idSchema,
  order: nonnegativeOrderSchema,
  transportMode: z.enum(TRANSPORT_MODES).optional(),
  mapsUrl: httpUrlSchema.optional(),
  notes: notesSchema.optional(),
}).strict()

export const tripDaySchema = z.object({
  id: idSchema,
  routeStopId: idSchema,
  date: isoDateSchema,
  dayNumber: z.number().int().positive(),
  notes: notesSchema.optional(),
  isLeisure: z.boolean(),
}).strict()

export const activitySchema = z.object({
  id: idSchema,
  dayId: idSchema,
  routeStopId: idSchema,
  title: requiredText,
  notes: notesSchema.optional(),
  slot: z.enum(ACTIVITY_SLOTS),
  startTime: timeSchema.optional(),
  endTime: timeSchema.optional(),
  durationMinutes: z.number().int().positive().optional(),
  category: z.enum(ACTIVITY_CATEGORIES),
  mapsUrl: httpUrlSchema.optional(),
  costInr: nonnegativeInrSchema.optional(),
  status: z.enum(ITEM_STATUSES),
  order: nonnegativeOrderSchema,
}).strict().superRefine((activity, context) => {
  if (activity.endTime && !activity.startTime) {
    context.addIssue({ code: z.ZodIssueCode.custom, path: ['startTime'], message: 'startTime is required when endTime is set' })
  }
  if (activity.startTime && activity.endTime && activity.endTime <= activity.startTime) {
    context.addIssue({ code: z.ZodIssueCode.custom, path: ['endTime'], message: 'endTime must be after startTime' })
  }
})

export const foodEntrySchema = z.object({
  id: idSchema,
  routeStopId: idSchema,
  dayId: idSchema.optional(),
  dish: requiredText,
  mealType: z.enum(MEAL_TYPES),
  restaurant: requiredText.optional(),
  mapsUrl: httpUrlSchema.optional(),
  notes: notesSchema.optional(),
  estimatedCostInr: nonnegativeInrSchema.optional(),
  priority: z.enum(FOOD_PRIORITIES),
  status: z.enum(ITEM_STATUSES),
}).strict()

export const arrivalDepartureEventSchema = z.object({
  id: idSchema,
  routeStopId: idSchema,
  dayId: idSchema.optional(),
  type: z.enum(ARRIVAL_DEPARTURE_TYPES),
  place: requiredText,
  dateTime: isoDateTimeSchema,
  mapsUrl: httpUrlSchema.optional(),
  notes: notesSchema.optional(),
}).strict()

export const budgetSchema = z.object({
  currency: z.literal('INR'),
  targetInr: nonnegativeInrSchema.optional(),
}).strict()

const tripPlanFields = z.object({
  schemaVersion: z.literal(CURRENT_SCHEMA_VERSION),
  metadata: tripMetadataSchema,
  routeStops: z.array(routeStopSchema),
  travelLegs: z.array(travelLegSchema),
  days: z.array(tripDaySchema),
  activities: z.array(activitySchema),
  foodEntries: z.array(foodEntrySchema),
  arrivalDepartureEvents: z.array(arrivalDepartureEventSchema),
  budget: budgetSchema,
}).strict()

type IssueContext = z.RefinementCtx

function addIssue(context: IssueContext, path: (string | number)[], message: string): void {
  context.addIssue({ code: z.ZodIssueCode.custom, path, message })
}

function checkUnique<T>(
  records: T[],
  valueOf: (record: T) => string | number,
  path: string,
  label: string,
  context: IssueContext,
): void {
  const seen = new Set<string | number>()
  records.forEach((record, index) => {
    const value = valueOf(record)
    if (seen.has(value)) addIssue(context, [path, index], `Duplicate ${label}: ${value}`)
    seen.add(value)
  })
}

export const tripPlanSchema: z.ZodType<TripPlan> = tripPlanFields.superRefine((plan, context) => {
  const { startDate, endDate } = plan.metadata
  if (endDate < startDate) {
    addIssue(context, ['metadata', 'endDate'], 'Trip end date must be on or after its start date')
  }

  checkUnique(plan.routeStops, (item) => item.id, 'routeStops', 'route stop ID', context)
  checkUnique(plan.routeStops, (item) => item.order, 'routeStops', 'route stop order', context)
  checkUnique(plan.travelLegs, (item) => item.id, 'travelLegs', 'travel leg ID', context)
  checkUnique(plan.travelLegs, (item) => item.order, 'travelLegs', 'travel leg order', context)
  checkUnique(plan.days, (item) => item.id, 'days', 'day ID', context)
  checkUnique(plan.days, (item) => item.date, 'days', 'day date', context)
  checkUnique(plan.days, (item) => item.dayNumber, 'days', 'day number', context)
  checkUnique(plan.activities, (item) => item.id, 'activities', 'activity ID', context)
  checkUnique(plan.foodEntries, (item) => item.id, 'foodEntries', 'food entry ID', context)
  checkUnique(plan.arrivalDepartureEvents, (item) => item.id, 'arrivalDepartureEvents', 'event ID', context)

  const orderedStops = [...plan.routeStops].sort((left, right) => left.order - right.order)
  const stopsById = new Map(plan.routeStops.map((stop) => [stop.id, stop]))
  const daysById = new Map(plan.days.map((day) => [day.id, day]))

  validateStopDateCoverage(plan.routeStops, startDate, endDate).forEach((message) => {
    addIssue(context, ['routeStops'], message)
  })

  plan.routeStops.forEach((stop, index) => {
    if (stop.endDate < stop.startDate) {
      addIssue(context, ['routeStops', index, 'endDate'], 'Stop end date must be on or after its start date')
    }
    if (stop.startDate < startDate || stop.endDate > endDate) {
      addIssue(context, ['routeStops', index], 'Stop dates must be within the trip date range')
    }
  })

  if (plan.travelLegs.length !== Math.max(0, plan.routeStops.length - 1)) {
    addIssue(context, ['travelLegs'], 'Route must have one travel leg between each pair of adjacent stops')
  }
  plan.travelLegs.forEach((leg, index) => {
    if (!stopsById.has(leg.fromStopId)) addIssue(context, ['travelLegs', index, 'fromStopId'], 'Unknown route stop ID')
    if (!stopsById.has(leg.toStopId)) addIssue(context, ['travelLegs', index, 'toStopId'], 'Unknown route stop ID')
    if (leg.fromStopId === leg.toStopId) addIssue(context, ['travelLegs', index, 'toStopId'], 'A travel leg must connect two different stops')
    const expectedFrom = orderedStops[leg.order]
    const expectedTo = orderedStops[leg.order + 1]
    if (!expectedFrom || !expectedTo || leg.fromStopId !== expectedFrom.id || leg.toStopId !== expectedTo.id) {
      addIssue(context, ['travelLegs', index], 'Travel leg must connect adjacent route stops in order')
    }
  })

  const expectedDates = isIsoDate(startDate) && isIsoDate(endDate) && endDate >= startDate
    ? enumerateDates(startDate, endDate)
    : []
  const orderedDays = [...plan.days].sort((left, right) => left.dayNumber - right.dayNumber)
  const actualDates = orderedDays.map((day) => day.date)
  const sequentialDayNumbers = orderedDays.every((day, index) => day.dayNumber === index + 1)
  if (!sequentialDayNumbers || expectedDates.length !== actualDates.length || expectedDates.some((date, index) => actualDates[index] !== date)) {
    addIssue(context, ['days'], 'Every trip date must have exactly one sequential itinerary day in order')
  }

  plan.days.forEach((day, index) => {
    const stop = stopsById.get(day.routeStopId)
    if (!stop) {
      addIssue(context, ['days', index, 'routeStopId'], 'Unknown route stop ID')
    } else if (day.date < stop.startDate || day.date > stop.endDate) {
      addIssue(context, ['days', index, 'date'], 'Day date must be within its route stop date range')
    }
    if (day.date < startDate || day.date > endDate) {
      addIssue(context, ['days', index, 'date'], 'Day date must be within the trip date range')
    }
  })

  const activityGroups = new Map<string, typeof plan.activities>()
  plan.activities.forEach((activity) => {
    const group = activityGroups.get(`${activity.dayId}:${activity.slot}`) ?? []
    group.push(activity)
    activityGroups.set(`${activity.dayId}:${activity.slot}`, group)
  })
  activityGroups.forEach((group) => {
    const orders = group.map((activity) => activity.order).sort((left, right) => left - right)
    if (orders.some((order, index) => order !== index)) {
      addIssue(context, ['activities'], 'Activity order must be consecutive within each day and time slot')
    }
  })

  plan.activities.forEach((activity, index) => {
    const day = daysById.get(activity.dayId)
    if (!stopsById.has(activity.routeStopId)) addIssue(context, ['activities', index, 'routeStopId'], 'Unknown route stop ID')
    if (!day) addIssue(context, ['activities', index, 'dayId'], 'Unknown day ID')
    else if (day.routeStopId !== activity.routeStopId) addIssue(context, ['activities', index, 'routeStopId'], 'Activity stop must match its day stop')
  })

  plan.foodEntries.forEach((food, index) => {
    if (!stopsById.has(food.routeStopId)) addIssue(context, ['foodEntries', index, 'routeStopId'], 'Unknown route stop ID')
    if (food.dayId) {
      const day = daysById.get(food.dayId)
      if (!day) addIssue(context, ['foodEntries', index, 'dayId'], 'Unknown day ID')
      else if (day.routeStopId !== food.routeStopId) addIssue(context, ['foodEntries', index, 'routeStopId'], 'Food entry stop must match its day stop')
    }
  })

  plan.arrivalDepartureEvents.forEach((event, index) => {
    const stop = stopsById.get(event.routeStopId)
    const eventDate = event.dateTime.slice(0, 10)
    if (!stop) addIssue(context, ['arrivalDepartureEvents', index, 'routeStopId'], 'Unknown route stop ID')
    else if (eventDate < stop.startDate || eventDate > stop.endDate) {
      addIssue(context, ['arrivalDepartureEvents', index, 'dateTime'], 'Event date must be within its route stop date range')
    }
    if (eventDate < startDate || eventDate > endDate) {
      addIssue(context, ['arrivalDepartureEvents', index, 'dateTime'], 'Event date must be within the trip date range')
    }
    if (event.dayId) {
      const day = daysById.get(event.dayId)
      if (!day) addIssue(context, ['arrivalDepartureEvents', index, 'dayId'], 'Unknown day ID')
      else {
        if (day.routeStopId !== event.routeStopId) addIssue(context, ['arrivalDepartureEvents', index, 'routeStopId'], 'Event stop must match its day stop')
        if (day.date !== eventDate) addIssue(context, ['arrivalDepartureEvents', index, 'dateTime'], 'Event date must match its referenced day')
      }
    }
  })
})

export function parseTripPlan(input: unknown): TripPlan {
  return tripPlanSchema.parse(input)
}
