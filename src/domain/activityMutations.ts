import type { Activity, ActivitySlot, TripPlan } from '../types/trip'

function touch(plan: TripPlan, activities: Activity[], updatedAt: string): TripPlan {
  return { ...plan, metadata: { ...plan.metadata, updatedAt }, activities: normalizeActivityOrder(activities) }
}

export function normalizeActivityOrder(activities: readonly Activity[]): Activity[] {
  const nextOrder = new Map<string, number>()
  return activities.map((activity) => {
    const key = `${activity.dayId}:${activity.slot}`
    const order = nextOrder.get(key) ?? 0
    nextOrder.set(key, order + 1)
    return { ...activity, order }
  })
}

function dayFor(plan: TripPlan, dayId: string) {
  const day = plan.days.find((candidate) => candidate.id === dayId)
  if (!day) throw new Error(`Unknown itinerary day: ${dayId}`)
  return day
}

export function addActivity(plan: TripPlan, activity: Activity, updatedAt: string): TripPlan {
  if (plan.activities.some((candidate) => candidate.id === activity.id)) throw new Error('Activity ID already exists')
  const day = dayFor(plan, activity.dayId)
  const order = plan.activities.filter((candidate) => candidate.dayId === day.id && candidate.slot === activity.slot).length
  return touch(plan, [...plan.activities, { ...activity, routeStopId: day.routeStopId, order }], updatedAt)
}

export function updateActivity(plan: TripPlan, activity: Activity, updatedAt: string): TripPlan {
  if (!plan.activities.some((candidate) => candidate.id === activity.id)) throw new Error('Activity does not exist')
  const day = dayFor(plan, activity.dayId)
  return touch(plan, plan.activities.map((candidate) => candidate.id === activity.id
    ? { ...activity, routeStopId: day.routeStopId }
    : candidate), updatedAt)
}

export function deleteActivity(plan: TripPlan, activityId: string, updatedAt: string): TripPlan {
  if (!plan.activities.some((candidate) => candidate.id === activityId)) throw new Error('Activity does not exist')
  return touch(plan, plan.activities.filter((candidate) => candidate.id !== activityId), updatedAt)
}

export function duplicateActivity(
  plan: TripPlan,
  activityId: string,
  duplicateId: string,
  updatedAt: string,
): TripPlan {
  if (plan.activities.some((candidate) => candidate.id === duplicateId)) throw new Error('Activity ID already exists')
  const sourceIndex = plan.activities.findIndex((candidate) => candidate.id === activityId)
  if (sourceIndex < 0) throw new Error('Activity does not exist')
  const source = plan.activities[sourceIndex]!
  const duplicate = { ...source, id: duplicateId, title: `${source.title} (copy)`, status: 'planned' as const }
  const activities = [...plan.activities]
  activities.splice(sourceIndex + 1, 0, duplicate)
  return touch(plan, activities, updatedAt)
}

export function moveActivity(
  plan: TripPlan,
  activityId: string,
  targetDayId: string,
  targetSlot: ActivitySlot,
  targetIndex: number,
  updatedAt: string,
): TripPlan {
  const source = plan.activities.find((candidate) => candidate.id === activityId)
  if (!source) throw new Error('Activity does not exist')
  const targetDay = dayFor(plan, targetDayId)
  const withoutSource = normalizeActivityOrder(plan.activities.filter((candidate) => candidate.id !== activityId))
  const targetGroup = withoutSource.filter((candidate) => candidate.dayId === targetDayId && candidate.slot === targetSlot)
  const boundedIndex = Math.max(0, Math.min(targetIndex, targetGroup.length))
  const beforeTargetId = targetGroup[boundedIndex]?.id
  const moved: Activity = {
    ...source,
    dayId: targetDay.id,
    routeStopId: targetDay.routeStopId,
    slot: targetSlot,
    order: boundedIndex,
  }
  const insertionIndex = beforeTargetId
    ? withoutSource.findIndex((candidate) => candidate.id === beforeTargetId)
    : withoutSource.length
  const activities = [...withoutSource]
  activities.splice(insertionIndex, 0, moved)
  return touch(plan, activities, updatedAt)
}
