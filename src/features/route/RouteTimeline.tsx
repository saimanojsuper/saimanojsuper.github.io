import { useEffect, useState } from 'react'
import {
  closestCenter,
  DndContext,
  KeyboardSensor,
  PointerSensor,
  useSensor,
  useSensors,
  type DragEndEvent,
} from '@dnd-kit/core'
import { arrayMove, SortableContext, sortableKeyboardCoordinates, verticalListSortingStrategy } from '@dnd-kit/sortable'
import { useStore } from 'zustand'
import { DayResolutionDialog } from '../../components/DayResolutionDialog'
import { scheduleStopsByDuration } from '../../domain/dateAllocation'
import { userFacingError } from '../../domain/errorMessage'
import { createStableId } from '../../domain/id'
import {
  addRouteStop,
  deleteRouteStop,
  editRouteStops,
  type RouteChangeDraft,
} from '../../domain/routeMutations'
import { selectCanRedo, selectCanUndo } from '../../store/selectors'
import { tripStore } from '../../store/tripStore'
import type { TravelLeg, TripPlan } from '../../types/trip'
import { ArrivalDepartureEditor } from './ArrivalDepartureEditor'
import { RouteStopCard } from './RouteStopCard'
import { TravelLegEditor } from './TravelLegEditor'

export function RouteTimeline({ plan }: { plan: TripPlan }) {
  const replacePlan = useStore(tripStore, (state) => state.replacePlan)
  const undo = useStore(tripStore, (state) => state.undo)
  const redo = useStore(tripStore, (state) => state.redo)
  const canUndo = useStore(tripStore, selectCanUndo)
  const canRedo = useStore(tripStore, selectCanRedo)
  const storageError = useStore(tripStore, (state) => state.ui.lastStorageError)
  const [routeDraft, setRouteDraft] = useState(() => [...plan.routeStops].sort((a, b) => a.order - b.order))
  const [pending, setPending] = useState<RouteChangeDraft | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [newCity, setNewCity] = useState('')
  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 6 } }),
    useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates }),
  )

  useEffect(() => {
    setRouteDraft([...plan.routeStops].sort((a, b) => a.order - b.order))
  }, [plan.routeStops])

  function presentChange(change: RouteChangeDraft) {
    setError(null)
    if (change.requiredDayChanges.length > 0) setPending(change)
    else replacePlan(change.finalize())
  }

  function attempt(operation: () => RouteChangeDraft) {
    try { presentChange(operation()) }
    catch (caught) { setError(userFacingError(caught, 'Route change failed.')) }
  }

  function saveRouteDraft() {
    if (routeDraft.some((stop) => !stop.city.trim())) {
      setError('Every destination needs a city name.')
      return
    }
    const normalized = routeDraft.map((stop, order) => ({ ...stop, city: stop.city.trim(), order }))
    attempt(() => editRouteStops(plan, normalized, new Date().toISOString(), createStableId))
  }

  function handleDragEnd(event: DragEndEvent) {
    const { active, over } = event
    if (!over || active.id === over.id) return
    const oldIndex = routeDraft.findIndex((stop) => stop.id === active.id)
    const newIndex = routeDraft.findIndex((stop) => stop.id === over.id)
    const reordered = arrayMove(routeDraft, oldIndex, newIndex)
    const scheduled = scheduleStopsByDuration(reordered, plan.metadata.startDate, plan.metadata.endDate)
    attempt(() => editRouteStops(plan, scheduled, new Date().toISOString(), createStableId))
  }

  function saveLeg(leg: TravelLeg) {
    try {
      replacePlan({
        ...plan,
        metadata: { ...plan.metadata, updatedAt: new Date().toISOString() },
        travelLegs: plan.travelLegs.map((candidate) => candidate.id === leg.id ? leg : candidate),
      })
      setError(null)
    } catch (caught) {
      setError(userFacingError(caught, 'Travel leg is invalid.'))
    }
  }

  function updateEvents(events: TripPlan['arrivalDepartureEvents']) {
    try {
      replacePlan({ ...plan, metadata: { ...plan.metadata, updatedAt: new Date().toISOString() }, arrivalDepartureEvents: events })
      setError(null)
    } catch (caught) {
      setError(userFacingError(caught, 'Route event is invalid.'))
    }
  }

  const orderedStops = [...plan.routeStops].sort((a, b) => a.order - b.order)

  return (
    <main className="planner-shell">
      <header className="planner-header">
        <div>
          <p className="eyebrow">Route builder</p>
          <h1>{plan.metadata.title}</h1>
          <p>{plan.metadata.startDate} → {plan.metadata.endDate} · {plan.days.length} days</p>
        </div>
        <div className="history-actions">
          <button className="button secondary small" type="button" disabled={!canUndo} onClick={undo}>Undo</button>
          <button className="button secondary small" type="button" disabled={!canRedo} onClick={redo}>Redo</button>
        </div>
      </header>

      {plan.metadata.coverImageUrl && <img className="cover-image" src={plan.metadata.coverImageUrl} alt="" />}
      {storageError && <p className="warning-banner">Draft could not be saved locally: {storageError}</p>}
      {error && <p className="form-error global-error" role="alert">{error}</p>}

      <section className="panel route-section">
        <div className="section-heading">
          <div><p className="eyebrow">{routeDraft.length} destinations</p><h2>Route timeline</h2><p>Drag to reorder. Date ranges must form one continuous trip with no gaps.</p></div>
        </div>

        <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={handleDragEnd}>
          <SortableContext items={routeDraft.map((stop) => stop.id)} strategy={verticalListSortingStrategy}>
            <div className="route-list">
              {routeDraft.map((stop, index) => (
                <RouteStopCard
                  key={stop.id}
                  stop={stop}
                  index={index}
                  canDelete={routeDraft.length > 1}
                  onChange={(updated) => setRouteDraft((current) => current.map((candidate) => candidate.id === stop.id ? updated : candidate))}
                  onDelete={(target) => {
                    if (window.confirm(`Delete ${target.city}? Its activities and food entries will also be deleted.`)) {
                      attempt(() => deleteRouteStop(plan, target.id, new Date().toISOString(), createStableId))
                    }
                  }}
                />
              ))}
            </div>
          </SortableContext>
        </DndContext>

        <div className="route-actions">
          <div className="add-stop-row">
            <label><span className="sr-only">New destination</span><input placeholder="Add another city" value={newCity} onChange={(event) => setNewCity(event.target.value)} /></label>
            <button className="button secondary" type="button" disabled={!newCity.trim()} onClick={() => {
              attempt(() => addRouteStop(plan, { id: createStableId(), city: newCity.trim() }, new Date().toISOString(), createStableId))
              setNewCity('')
            }}>Add stop</button>
          </div>
          <button className="button" type="button" onClick={saveRouteDraft}>Apply route details</button>
        </div>
      </section>

      {plan.travelLegs.length > 0 && (
        <section className="panel route-section">
          <div className="section-heading"><div><p className="eyebrow">Between cities</p><h2>Travel legs</h2></div></div>
          {[...plan.travelLegs].sort((a, b) => a.order - b.order).map((leg) => (
            <TravelLegEditor key={leg.id} leg={leg} from={orderedStops[leg.order]!} to={orderedStops[leg.order + 1]!} onSave={saveLeg} />
          ))}
        </section>
      )}

      <ArrivalDepartureEditor events={plan.arrivalDepartureEvents} stops={orderedStops} days={plan.days} onChange={updateEvents} />

      <section className="phase-note"><strong>Phase 2 boundary</strong><span>Day itinerary, activities, food, budget, and import/export arrive later.</span></section>

      {pending && (
        <DayResolutionDialog
          draft={pending}
          onCancel={() => setPending(null)}
          onResolve={(selections) => {
            try { replacePlan(pending.finalize(selections)); setPending(null); setError(null) }
            catch (caught) { setError(userFacingError(caught, 'Could not resolve schedule.')); setPending(null) }
          }}
        />
      )}
    </main>
  )
}
