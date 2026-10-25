import type { FoodEntry, ItemStatus, RouteStop, TripDay } from '../../types/trip'

export function FoodEntryCard({
  entry,
  stop,
  day,
  onDelete,
  onDuplicate,
  onEdit,
  onStatus,
}: {
  entry: FoodEntry
  stop: RouteStop
  day?: TripDay | undefined
  onDelete(): void
  onDuplicate(): void
  onEdit(): void
  onStatus(status: ItemStatus): void
}) {
  return (
    <article className={`food-card status-${entry.status}`}>
      <div className="food-card-main">
        <div className="food-title-row"><div><p className="eyebrow">{entry.mealType} · {entry.priority}</p><h3>{entry.dish}</h3></div>{entry.estimatedCostInr !== undefined && <strong>₹{entry.estimatedCostInr.toLocaleString('en-IN')}</strong>}</div>
        <p className="food-location">{stop.city}{day ? ` · Day ${day.dayNumber}` : ' · Any day'}{entry.restaurant ? ` · ${entry.restaurant}` : ''}</p>
        {entry.notes && <p className="food-notes">{entry.notes}</p>}
        {entry.mapsUrl && <a href={entry.mapsUrl} target="_blank" rel="noopener noreferrer">Open restaurant or place ↗</a>}
      </div>
      <div className="food-card-actions">
        <select aria-label={`Status for ${entry.dish}`} value={entry.status} onChange={(event) => onStatus(event.target.value as ItemStatus)}><option value="planned">Planned</option><option value="done">Done</option><option value="skipped">Skipped</option></select>
        <button className="button secondary small" type="button" onClick={onEdit}>Edit</button>
        <button className="button secondary small" type="button" onClick={onDuplicate}>Duplicate</button>
        <button className="text-button danger-text" type="button" onClick={onDelete}>Delete</button>
      </div>
    </article>
  )
}
