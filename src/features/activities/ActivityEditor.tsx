import { useState, type FormEvent } from 'react'
import { userFacingError } from '../../domain/errorMessage'
import {
  ACTIVITY_CATEGORIES,
  ACTIVITY_SLOTS,
  ITEM_STATUSES,
  type Activity,
  type ActivityCategory,
  type ActivitySlot,
  type ItemStatus,
  type TripDay,
} from '../../types/trip'

interface ActivityEditorProps {
  activity: Activity
  days: TripDay[]
  title: string
  onCancel(): void
  onSave(activity: Activity): void
}

export function ActivityEditor({ activity, days, title, onCancel, onSave }: ActivityEditorProps) {
  const [draft, setDraft] = useState(activity)
  const [error, setError] = useState<string | null>(null)

  function submit(event: FormEvent) {
    event.preventDefault()
    setError(null)
    try {
      const selectedDay = days.find((day) => day.id === draft.dayId)
      if (!selectedDay) throw new Error('Choose an itinerary day')
      onSave({
        ...draft,
        routeStopId: selectedDay.routeStopId,
        title: draft.title.trim(),
        notes: draft.notes?.trim() || undefined,
        mapsUrl: draft.mapsUrl?.trim() || undefined,
      })
    } catch (caught) {
      setError(userFacingError(caught, 'Activity could not be saved.'))
    }
  }

  return (
    <div className="modal-backdrop" role="presentation">
      <form className="modal activity-editor" role="dialog" aria-modal="true" aria-labelledby="activity-editor-title" onSubmit={submit}>
        <p className="eyebrow">Itinerary activity</p>
        <h2 id="activity-editor-title">{title}</h2>
        <div className="form-grid two-columns activity-form">
          <label className="full-width">Title<input autoFocus required value={draft.title} onChange={(event) => setDraft({ ...draft, title: event.target.value })} /></label>
          <label>Day<select value={draft.dayId} onChange={(event) => setDraft({ ...draft, dayId: event.target.value })}>{days.map((day) => <option key={day.id} value={day.id}>Day {day.dayNumber} · {day.date}</option>)}</select></label>
          <label>Time of day<select value={draft.slot} onChange={(event) => setDraft({ ...draft, slot: event.target.value as ActivitySlot })}>{ACTIVITY_SLOTS.map((slot) => <option key={slot} value={slot}>{slot}</option>)}</select></label>
          <label>Category<select value={draft.category} onChange={(event) => setDraft({ ...draft, category: event.target.value as ActivityCategory })}>{ACTIVITY_CATEGORIES.map((category) => <option key={category} value={category}>{category}</option>)}</select></label>
          <label>Status<select value={draft.status} onChange={(event) => setDraft({ ...draft, status: event.target.value as ItemStatus })}>{ITEM_STATUSES.map((status) => <option key={status} value={status}>{status}</option>)}</select></label>
          <label>Start time <small>optional</small><input type="time" value={draft.startTime ?? ''} onChange={(event) => setDraft({ ...draft, startTime: event.target.value || undefined })} /></label>
          <label>End time <small>optional</small><input type="time" value={draft.endTime ?? ''} onChange={(event) => setDraft({ ...draft, endTime: event.target.value || undefined })} /></label>
          <label>Duration in minutes <small>optional</small><input type="number" min="1" step="1" value={draft.durationMinutes ?? ''} onChange={(event) => setDraft({ ...draft, durationMinutes: event.target.value ? Number(event.target.value) : undefined })} /></label>
          <label>Cost in INR <small>optional</small><input type="number" min="0" step="0.01" value={draft.costInr ?? ''} onChange={(event) => setDraft({ ...draft, costInr: event.target.value ? Number(event.target.value) : undefined })} /></label>
          <label className="full-width">Maps or place URL <small>optional</small><input type="url" placeholder="https://…" value={draft.mapsUrl ?? ''} onChange={(event) => setDraft({ ...draft, mapsUrl: event.target.value || undefined })} /></label>
          <label className="full-width">Notes <small>optional</small><textarea rows={3} value={draft.notes ?? ''} onChange={(event) => setDraft({ ...draft, notes: event.target.value || undefined })} /></label>
        </div>
        {error && <p className="form-error" role="alert">{error}</p>}
        <div className="actions modal-actions">
          <button className="button secondary" type="button" onClick={onCancel}>Cancel</button>
          <button className="button" type="submit">Save activity</button>
        </div>
      </form>
    </div>
  )
}
