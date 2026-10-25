import { useState } from 'react'
import { useStore } from 'zustand'
import { userFacingError } from '../../domain/errorMessage'
import {
  addFoodEntry,
  deleteFoodEntry,
  duplicateFoodEntry,
  filterFoodEntries,
  updateFoodEntry,
  type FoodFilters,
} from '../../domain/foodMutations'
import { createStableId } from '../../domain/id'
import { tripStore } from '../../store/tripStore'
import type { FoodEntry, ItemStatus, TripPlan } from '../../types/trip'
import { FoodEntryCard } from './FoodEntryCard'
import { FoodEntryEditor } from './FoodEntryEditor'

interface EditorState { entry: FoodEntry; isNew: boolean }

function newFoodEntry(plan: TripPlan, filters: FoodFilters): FoodEntry {
  const day = filters.dayId ? plan.days.find((candidate) => candidate.id === filters.dayId) : undefined
  return {
    id: createStableId(),
    routeStopId: day?.routeStopId ?? filters.routeStopId ?? [...plan.routeStops].sort((a, b) => a.order - b.order)[0]!.id,
    dayId: day?.id,
    dish: '',
    mealType: 'lunch',
    priority: 'medium',
    status: 'planned',
  }
}

export function FoodPlanner({ plan }: { plan: TripPlan }) {
  const replacePlan = useStore(tripStore, (state) => state.replacePlan)
  const [filters, setFilters] = useState<FoodFilters>({})
  const [editor, setEditor] = useState<EditorState | null>(null)
  const [error, setError] = useState<string | null>(null)
  const stops = [...plan.routeStops].sort((a, b) => a.order - b.order)
  const days = [...plan.days].sort((a, b) => a.dayNumber - b.dayNumber)
  const filterDays = filters.routeStopId ? days.filter((day) => day.routeStopId === filters.routeStopId) : days
  const visibleEntries = filterFoodEntries(plan.foodEntries, plan.days, filters)
  const stopsById = new Map(plan.routeStops.map((stop) => [stop.id, stop]))
  const daysById = new Map(plan.days.map((day) => [day.id, day]))

  function commit(operation: () => TripPlan): boolean {
    try { replacePlan(operation()); setError(null); return true }
    catch (caught) { setError(userFacingError(caught, 'Food change failed.')); return false }
  }

  function save(entry: FoodEntry) {
    if (!entry.dish.trim()) throw new Error('Dish or food item is required')
    const saved = commit(() => editor?.isNew
      ? addFoodEntry(plan, entry, new Date().toISOString())
      : updateFoodEntry(plan, entry, new Date().toISOString()))
    if (saved) setEditor(null)
    else throw new Error('Review the food fields and try again')
  }

  return (
    <section className="food-planner" aria-labelledby="food-heading">
      <div className="workspace-heading">
        <div><p className="eyebrow">Must taste</p><h2 id="food-heading">Food planner</h2><p>Keep destination-wide ideas or tie a dish to a specific day.</p></div>
        <button className="button" type="button" onClick={() => setEditor({ entry: newFoodEntry(plan, filters), isNew: true })}>+ Add food</button>
      </div>
      {error && <p className="form-error global-error" role="alert">{error}</p>}

      <div className="panel food-filters">
        <label>Destination<select value={filters.routeStopId ?? ''} onChange={(event) => setFilters({ routeStopId: event.target.value || undefined })}><option value="">All destinations</option>{stops.map((stop) => <option key={stop.id} value={stop.id}>{stop.city}</option>)}</select></label>
        <label>Day<select value={filters.dayId ?? ''} onChange={(event) => {
          const day = daysById.get(event.target.value)
          setFilters(day ? { routeStopId: day.routeStopId, dayId: day.id } : { routeStopId: filters.routeStopId })
        }}><option value="">All days</option>{filterDays.map((day) => <option key={day.id} value={day.id}>Day {day.dayNumber} · {day.date}</option>)}</select></label>
        <p>{filters.dayId ? 'Includes items for this day and destination-wide ideas.' : `${visibleEntries.length} of ${plan.foodEntries.length} entries`}</p>
      </div>

      <div className="food-list">
        {visibleEntries.map((entry) => (
          <FoodEntryCard
            key={entry.id}
            entry={entry}
            stop={stopsById.get(entry.routeStopId)!}
            day={entry.dayId ? daysById.get(entry.dayId) : undefined}
            onEdit={() => setEditor({ entry, isNew: false })}
            onDuplicate={() => commit(() => duplicateFoodEntry(plan, entry.id, createStableId(), new Date().toISOString()))}
            onDelete={() => { if (window.confirm(`Delete “${entry.dish}”?`)) commit(() => deleteFoodEntry(plan, entry.id, new Date().toISOString())) }}
            onStatus={(status: ItemStatus) => commit(() => updateFoodEntry(plan, { ...entry, status }, new Date().toISOString()))}
          />
        ))}
        {visibleEntries.length === 0 && <div className="panel empty-food"><strong>No must-taste items here yet.</strong><span>Add one, or loosen the filters.</span></div>}
      </div>

      {editor && <FoodEntryEditor key={editor.entry.id} entry={editor.entry} plan={plan} title={editor.isNew ? 'Add must-taste item' : 'Edit must-taste item'} onCancel={() => setEditor(null)} onSave={save} />}
    </section>
  )
}
