import { useSortable } from '@dnd-kit/sortable'
import { CSS } from '@dnd-kit/utilities'
import type { Activity, ItemStatus } from '../../types/trip'

interface ActivityCardProps {
  activity: Activity
  hasConflict: boolean
  onDelete(): void
  onDuplicate(): void
  onEdit(): void
  onStatus(status: ItemStatus): void
}

export function ActivityCard({ activity, hasConflict, onDelete, onDuplicate, onEdit, onStatus }: ActivityCardProps) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({ id: activity.id })
  return (
    <article
      ref={setNodeRef}
      className={`activity-card status-${activity.status} ${isDragging ? 'dragging' : ''}`}
      style={{ transform: CSS.Transform.toString(transform), transition }}
    >
      <button className="activity-drag-handle" type="button" aria-label={`Move ${activity.title}`} {...attributes} {...listeners}>⠿</button>
      <div className="activity-content">
        <div className="activity-title-row">
          <h4>{activity.title}</h4>
          <span className="category-pill">{activity.category}</span>
        </div>
        <div className="activity-meta">
          {activity.startTime && <span>{activity.startTime}{activity.endTime ? `–${activity.endTime}` : ''}</span>}
          {activity.durationMinutes && <span>{activity.durationMinutes} min</span>}
          {activity.costInr !== undefined && <span>₹{activity.costInr.toLocaleString('en-IN')}</span>}
          {activity.mapsUrl && <a href={activity.mapsUrl} target="_blank" rel="noopener noreferrer">Open place ↗</a>}
        </div>
        {activity.notes && <p>{activity.notes}</p>}
        {hasConflict && <p className="conflict-warning" role="status">Time overlaps another activity on this day.</p>}
      </div>
      <div className="activity-controls">
        <select aria-label={`Status for ${activity.title}`} value={activity.status} onChange={(event) => onStatus(event.target.value as ItemStatus)}>
          <option value="planned">Planned</option><option value="done">Done</option><option value="skipped">Skipped</option>
        </select>
        <button className="icon-button" type="button" aria-label={`Edit ${activity.title}`} onClick={onEdit}>Edit</button>
        <button className="icon-button" type="button" aria-label={`Duplicate ${activity.title}`} onClick={onDuplicate}>⧉</button>
        <button className="icon-button danger" type="button" aria-label={`Delete ${activity.title}`} onClick={onDelete}>×</button>
      </div>
    </article>
  )
}
