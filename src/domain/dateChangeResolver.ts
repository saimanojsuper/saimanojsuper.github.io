import type { Activity, ArrivalDepartureEvent, FoodEntry, TripDay, TripPlan } from '../types/trip'

export type DayLinkedRecordType = 'activity' | 'foodEntry' | 'arrivalDepartureEvent'

export interface DayAssignmentChange {
  recordType: DayLinkedRecordType
  recordId: string
  label: string
  previousDayId: string
  routeStopId: string
  candidateDays: TripDay[]
}

export type DayResolutionSelections = Record<string, string>

function key(type: DayLinkedRecordType, id: string): string {
  return `${type}:${id}`
}

export function resolutionKey(change: Pick<DayAssignmentChange, 'recordType' | 'recordId'>): string {
  return key(change.recordType, change.recordId)
}

export function findRequiredDayChanges(plan: TripPlan, nextDays: readonly TripDay[]): DayAssignmentChange[] {
  const nextById = new Map(nextDays.map((day) => [day.id, day]))
  const candidates = (routeStopId: string) => nextDays.filter((day) => day.routeStopId === routeStopId)
  const changes: DayAssignmentChange[] = []

  const addIfAffected = (
    recordType: DayLinkedRecordType,
    record: Activity | FoodEntry | ArrivalDepartureEvent,
    label: string,
  ) => {
    if (!record.dayId) return
    const nextDay = nextById.get(record.dayId)
    if (!nextDay || nextDay.routeStopId !== record.routeStopId) {
      changes.push({
        recordType,
        recordId: record.id,
        label,
        previousDayId: record.dayId,
        routeStopId: record.routeStopId,
        candidateDays: candidates(record.routeStopId),
      })
    }
  }

  plan.activities.forEach((record) => addIfAffected('activity', record, record.title))
  plan.foodEntries.forEach((record) => addIfAffected('foodEntry', record, record.dish))
  plan.arrivalDepartureEvents.forEach((record) => addIfAffected('arrivalDepartureEvent', record, `${record.type}: ${record.place}`))
  return changes
}

export function applyDayResolutions(
  plan: TripPlan,
  nextDays: TripDay[],
  selections: DayResolutionSelections,
): TripPlan {
  const required = findRequiredDayChanges(plan, nextDays)
  const dayById = new Map(nextDays.map((day) => [day.id, day]))
  const unresolved = required.filter((change) => {
    const selected = dayById.get(selections[resolutionKey(change)] ?? '')
    return !selected || selected.routeStopId !== change.routeStopId
  })
  if (unresolved.length > 0) {
    throw new Error(`Choose a replacement day for: ${unresolved.map((change) => change.label).join(', ')}`)
  }

  const selectedDay = (type: DayLinkedRecordType, id: string) => dayById.get(selections[key(type, id)] ?? '')
  const activities = plan.activities.map((record) => {
    const day = selectedDay('activity', record.id)
    return day ? { ...record, dayId: day.id } : record
  })
  const foodEntries = plan.foodEntries.map((record) => {
    const day = selectedDay('foodEntry', record.id)
    return day ? { ...record, dayId: day.id } : record
  })
  const arrivalDepartureEvents = plan.arrivalDepartureEvents.map((record) => {
    const day = selectedDay('arrivalDepartureEvent', record.id)
    if (!day) return record
    return { ...record, dayId: day.id, dateTime: `${day.date}${record.dateTime.slice(10)}` }
  })

  return { ...plan, days: nextDays, activities, foodEntries, arrivalDepartureEvents }
}
