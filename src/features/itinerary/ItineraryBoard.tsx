import { useState } from 'react'
import {
  closestCenter,
  DndContext,
  KeyboardSensor,
  PointerSensor,
  useSensor,
  useSensors,
  type DragEndEvent,
} from '@dnd-kit/core'
import { sortableKeyboardCoordinates } from '@dnd-kit/sortable'
import { useStore } from 'zustand'
import {
  addActivity,
  deleteActivity,
  duplicateActivity,
  moveActivity,
  updateActivity,
} from '../../domain/activityMutations'
import { userFacingError } from '../../domain/errorMessage'
import { createStableId } from '../../domain/id'
import { updateTripDay } from '../../domain/itineraryMutations'
import { conflictingActivityIds } from '../../domain/timeConflicts'
import { tripStore } from '../../store/tripStore'
import type { Activity, ActivitySlot, ItemStatus, TripDay, TripPlan } from '../../types/trip'
import { ActivityEditor } from '../activities/ActivityEditor'
import { DayCard } from './DayCard'

interface EditorState { activity: Activity; isNew: boolean }

function newActivity(day: TripDay, slot: ActivitySlot): Activity {
  return {
    id: createStableId(),
    dayId: day.id,
    routeStopId: day.routeStopId,
    title: '',
    slot,
    category: 'sightseeing',
    status: 'planned',
    order: 0,
  }
}

function slotTarget(overId: string, plan: TripPlan): { dayId: string; slot: ActivitySlot; index: number } | null {
  const overActivity = plan.activities.find((activity) => activity.id === overId)
  if (overActivity) {
    const group = plan.activities
      .filter((activity) => activity.dayId === overActivity.dayId && activity.slot === overActivity.slot)
      .sort((left, right) => left.order - right.order)
    return { dayId: overActivity.dayId, slot: overActivity.slot, index: group.findIndex((activity) => activity.id === overId) }
  }
  if (!overId.startsWith('slot:')) return null
  const slot = (['morning', 'afternoon', 'evening'] as const).find((candidate) => overId.endsWith(`:${candidate}`))
  if (!slot) return null
  const dayId = overId.slice(5, -(slot.length + 1))
  const index = plan.activities.filter((activity) => activity.dayId === dayId && activity.slot === slot).length
  return { dayId, slot, index }
}

export function ItineraryBoard({ plan }: { plan: TripPlan }) {
  const replacePlan = useStore(tripStore, (state) => state.replacePlan)
  const [editor, setEditor] = useState<EditorState | null>(null)
  const [error, setError] = useState<string | null>(null)
  const conflictIds = conflictingActivityIds(plan.activities)
  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 6 } }),
    useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates }),
  )

  function commit(operation: () => TripPlan): boolean {
    try {
      replacePlan(operation())
      setError(null)
      return true
    } catch (caught) {
      setError(userFacingError(caught, 'Itinerary change failed.'))
      return false
    }
  }

  function handleDragEnd(event: DragEndEvent) {
    if (!event.over || event.active.id === event.over.id) return
    const activity = plan.activities.find((candidate) => candidate.id === event.active.id)
    const target = slotTarget(String(event.over.id), plan)
    if (!activity || !target) return
    if (activity.dayId !== target.dayId) {
      const targetDay = plan.days.find((day) => day.id === target.dayId)
      if (!window.confirm(`Move “${activity.title}” to day ${targetDay?.dayNumber ?? ''}?`)) return
    }
    commit(() => moveActivity(plan, activity.id, target.dayId, target.slot, target.index, new Date().toISOString()))
  }

  function saveActivity(activity: Activity) {
    if (!activity.title.trim()) throw new Error('Activity title is required')
    if (editor && !editor.isNew && editor.activity.dayId !== activity.dayId) {
      const targetDay = plan.days.find((day) => day.id === activity.dayId)
      if (!window.confirm(`Move this activity to day ${targetDay?.dayNumber ?? ''}?`)) return
    }
    const saved = commit(() => editor?.isNew
      ? addActivity(plan, activity, new Date().toISOString())
      : updateActivity(plan, activity, new Date().toISOString()))
    if (saved) setEditor(null)
    else throw new Error('Review the activity fields and try again')
  }

  const orderedDays = [...plan.days].sort((left, right) => left.dayNumber - right.dayNumber)
  const stopsById = new Map(plan.routeStops.map((stop) => [stop.id, stop]))

  return (
    <section className="itinerary-board" aria-labelledby="itinerary-heading">
      <div className="workspace-heading">
        <div><p className="eyebrow">Day by day</p><h2 id="itinerary-heading">Itinerary</h2><p>Drag activities between time slots or days. Cross-day moves ask before applying.</p></div>
        <span className="count-badge">{plan.activities.length} activities</span>
      </div>
      {error && <p className="form-error global-error" role="alert">{error}</p>}
      <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={handleDragEnd}>
        <div className="day-list">
          {orderedDays.map((day) => (
            <DayCard
              key={day.id}
              day={day}
              stop={stopsById.get(day.routeStopId)!}
              activities={plan.activities.filter((activity) => activity.dayId === day.id)}
              conflictIds={conflictIds}
              onAdd={(slot) => setEditor({ activity: newActivity(day, slot), isNew: true })}
              onDayUpdate={(update) => commit(() => updateTripDay(plan, day.id, update, new Date().toISOString()))}
              onDelete={(activity) => {
                if (window.confirm(`Delete “${activity.title}”?`)) commit(() => deleteActivity(plan, activity.id, new Date().toISOString()))
              }}
              onDuplicate={(activity) => commit(() => duplicateActivity(plan, activity.id, createStableId(), new Date().toISOString()))}
              onEdit={(activity) => setEditor({ activity, isNew: false })}
              onStatus={(activity, status: ItemStatus) => commit(() => updateActivity(plan, { ...activity, status }, new Date().toISOString()))}
            />
          ))}
        </div>
      </DndContext>
      {editor && (
        <ActivityEditor
          key={editor.activity.id}
          activity={editor.activity}
          days={orderedDays}
          title={editor.isNew ? 'Add activity' : 'Edit activity'}
          onCancel={() => setEditor(null)}
          onSave={saveActivity}
        />
      )}
    </section>
  )
}
