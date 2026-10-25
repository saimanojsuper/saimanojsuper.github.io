import { useEffect, useState } from 'react'
import type { Activity, ActivitySlot, FoodEntry, ItemStatus, RouteStop, TripDay } from '../../types/trip'
import { ACTIVITY_SLOTS } from '../../types/trip'
import { TimeSlotSection } from './TimeSlotSection'

interface DayCardProps {
  day: TripDay
  stop: RouteStop
  activities: Activity[]
  conflictIds: Set<string>
  foodEntries: FoodEntry[]
  onAdd(slot: ActivitySlot): void
  onDayUpdate(update: Pick<TripDay, 'notes' | 'isLeisure'>): void
  onDelete(activity: Activity): void
  onDuplicate(activity: Activity): void
  onEdit(activity: Activity): void
  onStatus(activity: Activity, status: ItemStatus): void
}

export function DayCard(props: DayCardProps) {
  const { day, stop, activities, conflictIds } = props
  const [notes, setNotes] = useState(day.notes ?? '')
  useEffect(() => setNotes(day.notes ?? ''), [day.notes])
  const formattedDate = new Intl.DateTimeFormat('en-IN', { weekday: 'short', day: 'numeric', month: 'short', year: 'numeric', timeZone: 'UTC' })
    .format(new Date(`${day.date}T00:00:00Z`))

  return (
    <article className="day-card" id={`day-${day.dayNumber}`}>
      <header className="day-card-header">
        <div className="day-number"><span>Day</span><strong>{day.dayNumber}</strong></div>
        <div><p className="eyebrow">{stop.city}</p><h2>{formattedDate}</h2></div>
        <label className="leisure-toggle"><input type="checkbox" checked={day.isLeisure} onChange={(event) => props.onDayUpdate({ notes, isLeisure: event.target.checked })} /> Leisure day</label>
      </header>

      {activities.length === 0 && day.isLeisure && <div className="leisure-state"><strong>At leisure</strong><span>No plans. That is a plan too.</span></div>}

      {props.foodEntries.length > 0 && (
        <section className="day-food-context" aria-label={`Must-taste items for day ${day.dayNumber}`}>
          <strong>Must taste</strong>
          <div>{props.foodEntries.map((entry) => <span key={entry.id} className={`status-${entry.status}`}>{entry.dish}<small>{entry.mealType}{entry.dayId ? '' : ' · any day'}</small></span>)}</div>
        </section>
      )}

      <div className="day-notes">
        <label>Day notes<textarea rows={2} placeholder="Reservations, reminders, or the vibe for today…" value={notes} onChange={(event) => setNotes(event.target.value)} /></label>
        <button className="button secondary small" type="button" disabled={notes === (day.notes ?? '')} onClick={() => props.onDayUpdate({ notes, isLeisure: day.isLeisure })}>Save notes</button>
      </div>

      <div className="time-slots">
        {ACTIVITY_SLOTS.map((slot) => (
          <TimeSlotSection
            key={slot}
            dayId={day.id}
            slot={slot}
            activities={activities.filter((activity) => activity.slot === slot).sort((left, right) => left.order - right.order)}
            conflictIds={conflictIds}
            onAdd={() => props.onAdd(slot)}
            onDelete={props.onDelete}
            onDuplicate={props.onDuplicate}
            onEdit={props.onEdit}
            onStatus={props.onStatus}
          />
        ))}
      </div>
    </article>
  )
}
