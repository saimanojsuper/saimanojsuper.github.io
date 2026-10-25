import { describe, expect, it } from 'vitest'
import type { RouteStop, TripDay } from '../types/trip'
import { generateItinerary, itineraryDayId } from './itineraryGenerator'

const routeStops: RouteStop[] = [
  { id: 'stop-a', city: 'Alpha', startDate: '2026-06-01', endDate: '2026-06-02', order: 0 },
  { id: 'stop-b', city: 'Beta', startDate: '2026-06-03', endDate: '2026-06-04', order: 1 },
]

describe('itinerary generation', () => {
  it('creates exactly one sequential itinerary day for every allocated date', () => {
    const days = generateItinerary(routeStops, '2026-06-01', '2026-06-04')

    expect(days).toHaveLength(4)
    expect(days.map(({ routeStopId, date, dayNumber }) => ({ routeStopId, date, dayNumber }))).toEqual([
      { routeStopId: 'stop-a', date: '2026-06-01', dayNumber: 1 },
      { routeStopId: 'stop-a', date: '2026-06-02', dayNumber: 2 },
      { routeStopId: 'stop-b', date: '2026-06-03', dayNumber: 3 },
      { routeStopId: 'stop-b', date: '2026-06-04', dayNumber: 4 },
    ])
    expect(days.map((day) => day.id)).toEqual([
      itineraryDayId('stop-a', '2026-06-01'),
      itineraryDayId('stop-a', '2026-06-02'),
      itineraryDayId('stop-b', '2026-06-03'),
      itineraryDayId('stop-b', '2026-06-04'),
    ])
  })

  it('preserves stable day identity and user-authored fields for unchanged assignments', () => {
    const existingDays: TripDay[] = [
      {
        id: 'custom-day-id',
        routeStopId: 'stop-a',
        date: '2026-06-02',
        dayNumber: 99,
        notes: 'Keep this note',
        isLeisure: true,
      },
    ]

    const days = generateItinerary(routeStops, '2026-06-01', '2026-06-04', existingDays)
    const preserved = days.find((day) => day.date === '2026-06-02')

    expect(preserved).toEqual({
      id: 'custom-day-id',
      routeStopId: 'stop-a',
      date: '2026-06-02',
      dayNumber: 2,
      notes: 'Keep this note',
      isLeisure: true,
    })
  })

  it('refuses to generate days from a route with a manual date gap', () => {
    const gappedStops: RouteStop[] = [
      routeStops[0]!,
      { ...routeStops[1]!, startDate: '2026-06-04' },
    ]

    expect(() => generateItinerary(gappedStops, '2026-06-01', '2026-06-04'))
      .toThrow(/avoid a gap or overlap/)
  })
})
