import type { CURRENT_SCHEMA_VERSION } from '../constants/schema'

export const ACTIVITY_SLOTS = ['morning', 'afternoon', 'evening'] as const
export const ITEM_STATUSES = ['planned', 'done', 'skipped'] as const
export const ACTIVITY_CATEGORIES = [
  'sightseeing',
  'culture',
  'nature',
  'adventure',
  'shopping',
  'relaxation',
  'food',
  'transport',
  'other',
] as const
export const TRANSPORT_MODES = [
  'flight',
  'train',
  'bus',
  'car',
  'taxi',
  'ferry',
  'bicycle',
  'walk',
  'other',
] as const
export const MEAL_TYPES = ['breakfast', 'lunch', 'dinner', 'snack', 'drink', 'other'] as const
export const FOOD_PRIORITIES = ['low', 'medium', 'high', 'must-try'] as const
export const ARRIVAL_DEPARTURE_TYPES = ['arrival', 'departure'] as const

export type ActivitySlot = (typeof ACTIVITY_SLOTS)[number]
export type ItemStatus = (typeof ITEM_STATUSES)[number]
export type ActivityCategory = (typeof ACTIVITY_CATEGORIES)[number]
export type TransportMode = (typeof TRANSPORT_MODES)[number]
export type MealType = (typeof MEAL_TYPES)[number]
export type FoodPriority = (typeof FOOD_PRIORITIES)[number]
export type ArrivalDepartureType = (typeof ARRIVAL_DEPARTURE_TYPES)[number]

export interface TripMetadata {
  id: string
  title: string
  description?: string | undefined
  coverImageUrl?: string | undefined
  startDate: string
  endDate: string
  createdAt: string
  updatedAt: string
}

export interface RouteStop {
  id: string
  city: string
  startDate: string
  endDate: string
  order: number
}

export interface TravelLeg {
  id: string
  fromStopId: string
  toStopId: string
  order: number
  transportMode?: TransportMode | undefined
  mapsUrl?: string | undefined
  notes?: string | undefined
}

export interface TripDay {
  id: string
  routeStopId: string
  date: string
  dayNumber: number
  notes?: string | undefined
  isLeisure: boolean
}

export interface Activity {
  id: string
  dayId: string
  routeStopId: string
  title: string
  notes?: string | undefined
  slot: ActivitySlot
  startTime?: string | undefined
  endTime?: string | undefined
  durationMinutes?: number | undefined
  category: ActivityCategory
  mapsUrl?: string | undefined
  costInr?: number | undefined
  status: ItemStatus
  order: number
}

export interface FoodEntry {
  id: string
  routeStopId: string
  dayId?: string | undefined
  dish: string
  mealType: MealType
  restaurant?: string | undefined
  mapsUrl?: string | undefined
  notes?: string | undefined
  estimatedCostInr?: number | undefined
  priority: FoodPriority
  status: ItemStatus
}

export interface ArrivalDepartureEvent {
  id: string
  routeStopId: string
  dayId?: string | undefined
  type: ArrivalDepartureType
  place: string
  dateTime: string
  mapsUrl?: string | undefined
  notes?: string | undefined
}

export interface Budget {
  currency: 'INR'
  targetInr?: number | undefined
}

export interface TripPlan {
  schemaVersion: typeof CURRENT_SCHEMA_VERSION
  metadata: TripMetadata
  routeStops: RouteStop[]
  travelLegs: TravelLeg[]
  days: TripDay[]
  activities: Activity[]
  foodEntries: FoodEntry[]
  arrivalDepartureEvents: ArrivalDepartureEvent[]
  budget: Budget
}
