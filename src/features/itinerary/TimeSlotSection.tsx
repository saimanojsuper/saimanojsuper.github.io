import { useDroppable } from '@dnd-kit/core'
import { SortableContext, verticalListSortingStrategy } from '@dnd-kit/sortable'
import type { Activity, ActivitySlot, ItemStatus } from '../../types/trip'
import { ActivityCard } from '../activities/ActivityCard'

function slotContainerId(dayId: string, slot: ActivitySlot): string {
  return `slot:${dayId}:${slot}`
}

interface TimeSlotSectionProps {
  dayId: string
  slot: ActivitySlot
  activities: Activity[]
  conflictIds: Set<string>
  onAdd(): void
  onDelete(activity: Activity): void
  onDuplicate(activity: Activity): void
  onEdit(activity: Activity): void
  onStatus(activity: Activity, status: ItemStatus): void
}

export function TimeSlotSection(props: TimeSlotSectionProps) {
  const { dayId, slot, activities, conflictIds } = props
  const containerId = slotContainerId(dayId, slot)
  const { isOver, setNodeRef } = useDroppable({ id: containerId, data: { dayId, slot } })
  return (
    <section ref={setNodeRef} className={`time-slot ${isOver ? 'drop-target' : ''}`} aria-labelledby={`${containerId}-heading`}>
      <div className="time-slot-heading">
        <h3 id={`${containerId}-heading`}>{slot}</h3>
        <button className="text-button small-text" type="button" onClick={props.onAdd}>+ Add</button>
      </div>
      <SortableContext items={activities.map((activity) => activity.id)} strategy={verticalListSortingStrategy}>
        <div className="activity-list">
          {activities.map((activity) => (
            <ActivityCard
              key={activity.id}
              activity={activity}
              hasConflict={conflictIds.has(activity.id)}
              onDelete={() => props.onDelete(activity)}
              onDuplicate={() => props.onDuplicate(activity)}
              onEdit={() => props.onEdit(activity)}
              onStatus={(status) => props.onStatus(activity, status)}
            />
          ))}
          {activities.length === 0 && <p className="slot-empty">Drop an activity here or add one.</p>}
        </div>
      </SortableContext>
    </section>
  )
}
