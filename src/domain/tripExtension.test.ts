import { describe, expect, it } from 'vitest'
import { createValidPlan } from '../test/fixtures'
import { applyArrivalDepartureEvents, extendTripEndDate } from './tripExtension'

const UPDATED_AT = '2026-10-25T12:00:00Z'

describe('applyArrivalDepartureEvents', () => {
  it('extends from a final departure while preserving schedule identity and the entered time representation', () => {
    const plan = createValidPlan()
    const existingDayIds = plan.days.map((day) => day.id)
    const existingActivities = structuredClone(plan.activities)
    const events = [
      {
        ...plan.arrivalDepartureEvents[0]!,
        routeStopId: 'stop-agra',
        dayId: 'day-3',
        dateTime: '2026-11-03T22:10:00-04:00',
      },
      {
        id: 'departure',
        routeStopId: 'stop-agra',
        type: 'departure' as const,
        place: 'Agra Cantt',
        dateTime: '2026-11-06T18:45:00+05:30',
      },
    ]

    const result = applyArrivalDepartureEvents(plan, events, UPDATED_AT)

    expect(result.metadata).toMatchObject({ endDate: '2026-11-06', updatedAt: UPDATED_AT })
    expect(result.routeStops.at(-1)).toEqual({ ...plan.routeStops.at(-1)!, endDate: '2026-11-06' })
    expect(result.days.map((day) => day.date)).toEqual([
      '2026-11-01',
      '2026-11-02',
      '2026-11-03',
      '2026-11-04',
      '2026-11-05',
      '2026-11-06',
    ])
    expect(result.days.slice(0, existingDayIds.length).map((day) => day.id)).toEqual(existingDayIds)
    expect(result.activities).toEqual(existingActivities)
    expect(result.arrivalDepartureEvents[0]).toMatchObject({
      routeStopId: 'stop-delhi',
      dayId: 'day-1',
      dateTime: '2026-11-01T22:10:00-04:00',
    })
    expect(result.arrivalDepartureEvents[1]).toMatchObject({
      routeStopId: 'stop-agra',
      dayId: 'day:stop-agra:2026-11-06',
      dateTime: '2026-11-06T18:45:00+05:30',
    })
  })

  it.each([
    ['before its stop starts', 'stop-agra', '2026-11-02T08:00:00+05:30'],
    ['outside its non-final stop', 'stop-delhi', '2026-11-03T08:00:00+05:30'],
  ])('rejects a departure %s without mutating the plan', (_case, routeStopId, dateTime) => {
    const plan = createValidPlan()
    const snapshot = structuredClone(plan)
    const invalidDeparture = {
      id: 'invalid-departure',
      routeStopId,
      type: 'departure' as const,
      place: 'Station',
      dateTime,
    }

    expect(() => applyArrivalDepartureEvents(plan, [invalidDeparture], UPDATED_AT)).toThrow(
      'Departure date must be inside its destination range or later than the trip end date',
    )
    expect(plan).toEqual(snapshot)
  })
})

describe('extendTripEndDate', () => {
  it('adds new days only to the final stop and keeps existing day identities and activities assigned', () => {
    const plan = createValidPlan()
    const originalActivity = structuredClone(plan.activities[0])

    const result = extendTripEndDate(plan, '2026-11-06', UPDATED_AT)

    expect(result.metadata).toMatchObject({ endDate: '2026-11-06', updatedAt: UPDATED_AT })
    expect(result.routeStops).toEqual([
      plan.routeStops[0],
      { ...plan.routeStops[1], endDate: '2026-11-06' },
    ])
    expect(result.days.map((day) => [day.date, day.routeStopId])).toEqual([
      ['2026-11-01', 'stop-delhi'],
      ['2026-11-02', 'stop-delhi'],
      ['2026-11-03', 'stop-agra'],
      ['2026-11-04', 'stop-agra'],
      ['2026-11-05', 'stop-agra'],
      ['2026-11-06', 'stop-agra'],
    ])
    expect(result.days.slice(0, 3).map((day) => day.id)).toEqual(plan.days.map((day) => day.id))
    expect(result.activities[0]).toEqual(originalActivity)
    expect(plan.metadata.endDate).toBe('2026-11-03')
  })

  it('pins arrival to trip start and moves departure to the new final day while preserving time and offset suffixes', () => {
    const plan = createValidPlan()
    plan.arrivalDepartureEvents = [
      {
        id: 'arrival',
        routeStopId: 'stop-agra',
        dayId: 'day-3',
        type: 'arrival',
        place: 'Airport',
        dateTime: '2026-11-03T23:59:58-04:00',
      },
      {
        id: 'departure',
        routeStopId: 'stop-delhi',
        dayId: 'day-1',
        type: 'departure',
        place: 'Station',
        dateTime: '2026-11-01T07:05:06+05:30',
      },
    ]

    const result = extendTripEndDate(plan, '2026-11-05', UPDATED_AT)
    const [arrival, departure] = result.arrivalDepartureEvents

    expect(arrival).toMatchObject({
      routeStopId: 'stop-delhi',
      dayId: 'day-1',
      dateTime: '2026-11-01T23:59:58-04:00',
    })
    expect(departure).toMatchObject({
      routeStopId: 'stop-agra',
      dayId: 'day:stop-agra:2026-11-05',
      dateTime: '2026-11-05T07:05:06+05:30',
    })
  })

  it.each(['2026-11-03', '2026-11-02'])(
    'rejects a same or earlier end date (%s)',
    (newEndDate) => {
      expect(() => extendTripEndDate(createValidPlan(), newEndDate, UPDATED_AT)).toThrow('must be later')
    },
  )

  it('rejects malformed dates', () => {
    expect(() => extendTripEndDate(createValidPlan(), 'not-a-date', UPDATED_AT)).toThrow('valid new trip end date')
  })
})
