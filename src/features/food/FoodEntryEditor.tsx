import { useState, type FormEvent } from 'react'
import { userFacingError } from '../../domain/errorMessage'
import {
  FOOD_PRIORITIES,
  ITEM_STATUSES,
  MEAL_TYPES,
  type FoodEntry,
  type FoodPriority,
  type ItemStatus,
  type MealType,
  type TripPlan,
} from '../../types/trip'

export function FoodEntryEditor({
  entry,
  plan,
  title,
  onCancel,
  onSave,
}: {
  entry: FoodEntry
  plan: TripPlan
  title: string
  onCancel(): void
  onSave(entry: FoodEntry): void
}) {
  const [draft, setDraft] = useState(entry)
  const [error, setError] = useState<string | null>(null)
  const days = plan.days.filter((day) => day.routeStopId === draft.routeStopId).sort((a, b) => a.dayNumber - b.dayNumber)

  function submit(event: FormEvent) {
    event.preventDefault()
    try {
      if (draft.mapsUrl) {
        const protocol = new URL(draft.mapsUrl).protocol
        if (protocol !== 'http:' && protocol !== 'https:') throw new Error('Place URL must use http or https')
      }
      onSave({
        ...draft,
        dish: draft.dish.trim(),
        restaurant: draft.restaurant?.trim() || undefined,
        mapsUrl: draft.mapsUrl?.trim() || undefined,
        notes: draft.notes?.trim() || undefined,
      })
    } catch (caught) {
      setError(userFacingError(caught, 'Food entry could not be saved.'))
    }
  }

  return (
    <div className="modal-backdrop" role="presentation">
      <form className="modal food-editor" role="dialog" aria-modal="true" aria-labelledby="food-editor-title" onSubmit={submit}>
        <p className="eyebrow">Must-taste planner</p>
        <h2 id="food-editor-title">{title}</h2>
        <div className="form-grid two-columns food-form">
          <label className="full-width">Dish or food item<input autoFocus required value={draft.dish} onChange={(event) => setDraft({ ...draft, dish: event.target.value })} /></label>
          <label>Destination<select value={draft.routeStopId} onChange={(event) => setDraft({ ...draft, routeStopId: event.target.value, dayId: undefined })}>{[...plan.routeStops].sort((a, b) => a.order - b.order).map((stop) => <option key={stop.id} value={stop.id}>{stop.city}</option>)}</select></label>
          <label>Day <small>optional</small><select value={draft.dayId ?? ''} onChange={(event) => setDraft({ ...draft, dayId: event.target.value || undefined })}><option value="">Any day at this destination</option>{days.map((day) => <option key={day.id} value={day.id}>Day {day.dayNumber} · {day.date}</option>)}</select></label>
          <label>Meal type<select value={draft.mealType} onChange={(event) => setDraft({ ...draft, mealType: event.target.value as MealType })}>{MEAL_TYPES.map((meal) => <option key={meal} value={meal}>{meal}</option>)}</select></label>
          <label>Priority<select value={draft.priority} onChange={(event) => setDraft({ ...draft, priority: event.target.value as FoodPriority })}>{FOOD_PRIORITIES.map((priority) => <option key={priority} value={priority}>{priority}</option>)}</select></label>
          <label>Status<select value={draft.status} onChange={(event) => setDraft({ ...draft, status: event.target.value as ItemStatus })}>{ITEM_STATUSES.map((status) => <option key={status} value={status}>{status}</option>)}</select></label>
          <label>Estimated cost in INR <small>optional</small><input type="number" min="0" step="0.01" value={draft.estimatedCostInr ?? ''} onChange={(event) => setDraft({ ...draft, estimatedCostInr: event.target.value ? Number(event.target.value) : undefined })} /></label>
          <label className="full-width">Restaurant <small>optional</small><input value={draft.restaurant ?? ''} onChange={(event) => setDraft({ ...draft, restaurant: event.target.value || undefined })} /></label>
          <label className="full-width">Restaurant or Maps URL <small>optional</small><input type="url" placeholder="https://…" value={draft.mapsUrl ?? ''} onChange={(event) => setDraft({ ...draft, mapsUrl: event.target.value || undefined })} /></label>
          <label className="full-width">Notes <small>optional</small><textarea rows={3} value={draft.notes ?? ''} onChange={(event) => setDraft({ ...draft, notes: event.target.value || undefined })} /></label>
        </div>
        {error && <p className="form-error" role="alert">{error}</p>}
        <div className="actions modal-actions"><button className="button secondary" type="button" onClick={onCancel}>Cancel</button><button className="button" type="submit">Save food</button></div>
      </form>
    </div>
  )
}
