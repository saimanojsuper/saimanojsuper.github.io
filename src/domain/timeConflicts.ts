import type { Activity } from '../types/trip'

export interface TimeConflict {
  firstActivityId: string
  secondActivityId: string
  overlapMinutes: number
}

function minutes(time: string): number {
  const [hours, value] = time.split(':').map(Number)
  return hours! * 60 + value!
}

export function findTimeConflicts(activities: readonly Activity[]): TimeConflict[] {
  const timed = activities.filter((activity) => activity.startTime && activity.endTime)
  const conflicts: TimeConflict[] = []

  timed.forEach((first, index) => {
    timed.slice(index + 1).forEach((second) => {
      if (first.dayId !== second.dayId) return
      const overlap = Math.min(minutes(first.endTime!), minutes(second.endTime!))
        - Math.max(minutes(first.startTime!), minutes(second.startTime!))
      if (overlap > 0) {
        conflicts.push({ firstActivityId: first.id, secondActivityId: second.id, overlapMinutes: overlap })
      }
    })
  })

  return conflicts
}

export function conflictingActivityIds(activities: readonly Activity[]): Set<string> {
  return new Set(findTimeConflicts(activities).flatMap((conflict) => [conflict.firstActivityId, conflict.secondActivityId]))
}
