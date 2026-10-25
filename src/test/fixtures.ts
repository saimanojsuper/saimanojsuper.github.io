import { CURRENT_SCHEMA_VERSION } from '../constants/schema'
import type { TripPlan } from '../types/trip'

export function createValidPlan(): TripPlan {
  return {
    schemaVersion: CURRENT_SCHEMA_VERSION,
    metadata: {
      id: 'trip-1',
      title: 'Golden Triangle',
      description: 'Delhi, Agra, and Jaipur',
      startDate: '2026-11-01',
      endDate: '2026-11-03',
      createdAt: '2026-10-24T12:00:00Z',
      updatedAt: '2026-10-24T12:00:00Z',
    },
    routeStops: [
      { id: 'stop-delhi', city: 'Delhi', startDate: '2026-11-01', endDate: '2026-11-02', order: 0 },
      { id: 'stop-agra', city: 'Agra', startDate: '2026-11-03', endDate: '2026-11-03', order: 1 },
    ],
    travelLegs: [
      {
        id: 'leg-1',
        fromStopId: 'stop-delhi',
        toStopId: 'stop-agra',
        order: 0,
        transportMode: 'train',
        mapsUrl: 'https://maps.google.com/?q=Agra',
      },
    ],
    days: [
      { id: 'day-1', routeStopId: 'stop-delhi', date: '2026-11-01', dayNumber: 1, isLeisure: false },
      { id: 'day-2', routeStopId: 'stop-delhi', date: '2026-11-02', dayNumber: 2, isLeisure: true },
      { id: 'day-3', routeStopId: 'stop-agra', date: '2026-11-03', dayNumber: 3, isLeisure: false },
    ],
    activities: [
      {
        id: 'activity-1',
        dayId: 'day-1',
        routeStopId: 'stop-delhi',
        title: 'See Humayun’s Tomb',
        slot: 'morning',
        startTime: '09:00',
        durationMinutes: 120,
        category: 'culture',
        mapsUrl: 'https://maps.app.goo.gl/example',
        costInr: 600,
        status: 'planned',
        order: 0,
      },
    ],
    foodEntries: [
      {
        id: 'food-1',
        routeStopId: 'stop-agra',
        dayId: 'day-3',
        dish: 'Petha',
        mealType: 'snack',
        restaurant: 'Local sweet shop',
        estimatedCostInr: 250,
        priority: 'must-try',
        status: 'planned',
      },
    ],
    arrivalDepartureEvents: [
      {
        id: 'event-1',
        routeStopId: 'stop-agra',
        dayId: 'day-3',
        type: 'arrival',
        place: 'Agra Cantt',
        dateTime: '2026-11-03T09:15:00+05:30',
      },
    ],
    budget: { currency: 'INR', targetInr: 20_000 },
  }
}
