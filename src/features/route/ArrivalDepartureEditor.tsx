import { useEffect, useState } from 'react'
import { toOffsetIso } from '../../domain/dateUtils'
import { createStableId } from '../../domain/id'
import type { ArrivalDepartureEvent, ArrivalDepartureType, RouteStop, TripDay } from '../../types/trip'

interface EventFormState {
  type: ArrivalDepartureType
  routeStopId: string
  place: string
  dateTime: string
  mapsUrl: string
  notes: string
}

function initialForm(stop: RouteStop): EventFormState {
  return { type: 'arrival', routeStopId: stop.id, place: '', dateTime: `${stop.startDate}T09:00`, mapsUrl: '', notes: '' }
}

function toForm(event: ArrivalDepartureEvent): EventFormState {
  return {
    type: event.type,
    routeStopId: event.routeStopId,
    place: event.place,
    dateTime: event.dateTime.slice(0, 16),
    mapsUrl: event.mapsUrl ?? '',
    notes: event.notes ?? '',
  }
}

function EventFields({ value, stops, tripEndDate, onChange }: { value: EventFormState; stops: RouteStop[]; tripEndDate: string; onChange(value: EventFormState): void }) {
  const selectedStop = stops.find((stop) => stop.id === value.routeStopId) ?? stops[0]!
  const canExtendTrip = value.type === 'departure' && selectedStop.id === stops.at(-1)?.id
  return (
    <div className="form-grid two-columns">
      <label>Event type<select value={value.type} onChange={(event) => onChange({ ...value, type: event.target.value as ArrivalDepartureType })}><option value="arrival">Arrival</option><option value="departure">Departure</option></select></label>
      <label>Destination<select value={value.routeStopId} onChange={(event) => {
        const stop = stops.find((candidate) => candidate.id === event.target.value)!
        onChange({ ...value, routeStopId: stop.id, dateTime: `${stop.startDate}T09:00` })
      }}>{stops.map((stop) => <option key={stop.id} value={stop.id}>{stop.city}</option>)}</select></label>
      <label>Place<input value={value.place} onChange={(event) => onChange({ ...value, place: event.target.value })} /></label>
      <label>Date and time<input type="datetime-local" min={`${selectedStop.startDate}T00:00`} max={canExtendTrip ? undefined : `${selectedStop.endDate}T23:59`} value={value.dateTime} onChange={(event) => onChange({ ...value, dateTime: event.target.value })} />{canExtendTrip && <small>Dates after {tripEndDate} extend the final destination automatically.</small>}</label>
      <label>Directions URL<input type="url" placeholder="https://…" value={value.mapsUrl} onChange={(event) => onChange({ ...value, mapsUrl: event.target.value })} /></label>
      <label>Notes<input value={value.notes} onChange={(event) => onChange({ ...value, notes: event.target.value })} /></label>
    </div>
  )
}

function buildEvent(form: EventFormState, id: string, stops: RouteStop[], days: TripDay[], tripEndDate: string): ArrivalDepartureEvent {
  const stop = stops.find((candidate) => candidate.id === form.routeStopId)
  const finalStop = stops.at(-1)
  const date = form.dateTime.slice(0, 10)
  const extendsTrip = form.type === 'departure' && stop?.id === finalStop?.id && date > tripEndDate
  if (!stop || date < stop.startDate || (date > stop.endDate && !extendsTrip)) throw new Error('Event date must be inside its destination dates; only a final departure may extend the trip.')
  if (!form.place.trim()) throw new Error('Event place is required.')
  const day = days.find((candidate) => candidate.routeStopId === stop.id && candidate.date === date)
  if (!day && !extendsTrip) throw new Error('No itinerary day matches this event date.')
  return {
    id,
    routeStopId: stop.id,
    dayId: day?.id,
    type: form.type,
    place: form.place.trim(),
    dateTime: toOffsetIso(form.dateTime),
    mapsUrl: form.mapsUrl.trim() || undefined,
    notes: form.notes.trim() || undefined,
  }
}

function ExistingEvent({ event, stops, days, tripEndDate, onSave, onDelete }: {
  event: ArrivalDepartureEvent
  stops: RouteStop[]
  days: TripDay[]
  tripEndDate: string
  onSave(event: ArrivalDepartureEvent): void
  onDelete(): void
}) {
  const [form, setForm] = useState(() => toForm(event))
  const [error, setError] = useState<string | null>(null)
  useEffect(() => setForm(toForm(event)), [event])
  return (
    <article className="event-card">
      <EventFields value={form} stops={stops} tripEndDate={tripEndDate} onChange={setForm} />
      {error && <p className="form-error" role="alert">{error}</p>}
      <div className="actions">
        <button className="button small" type="button" onClick={() => {
          try { onSave(buildEvent(form, event.id, stops, days, tripEndDate)); setError(null) }
          catch (caught) { setError(caught instanceof Error ? caught.message : 'Invalid event') }
        }}>Save event</button>
        <button className="text-button danger-text" type="button" onClick={onDelete}>Delete</button>
      </div>
    </article>
  )
}

export function ArrivalDepartureEditor({
  events,
  stops,
  days,
  tripEndDate,
  onChange,
}: {
  events: ArrivalDepartureEvent[]
  stops: RouteStop[]
  days: TripDay[]
  tripEndDate: string
  onChange(events: ArrivalDepartureEvent[]): void
}) {
  const [adding, setAdding] = useState(false)
  const [form, setForm] = useState(() => initialForm(stops[0]!))
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    if (!stops.some((stop) => stop.id === form.routeStopId)) setForm(initialForm(stops[0]!))
  }, [form.routeStopId, stops])

  return (
    <section className="panel route-section">
      <div className="section-heading">
        <div><p className="eyebrow">Route events</p><h2>Arrivals & departures</h2></div>
        <button className="button secondary small" type="button" onClick={() => setAdding((value) => !value)}>{adding ? 'Cancel' : '+ Add event'}</button>
      </div>
      {events.length === 0 && !adding && <p className="empty-copy">No arrival or departure details yet.</p>}
      {events.map((event) => (
        <ExistingEvent
          key={event.id}
          event={event}
          stops={stops}
          days={days}
          tripEndDate={tripEndDate}
          onSave={(updated) => onChange(events.map((candidate) => candidate.id === event.id ? updated : candidate))}
          onDelete={() => onChange(events.filter((candidate) => candidate.id !== event.id))}
        />
      ))}
      {adding && (
        <article className="event-card new-event">
          <h3>New route event</h3>
          <EventFields value={form} stops={stops} tripEndDate={tripEndDate} onChange={setForm} />
          {error && <p className="form-error" role="alert">{error}</p>}
          <button className="button small" type="button" onClick={() => {
            try {
              onChange([...events, buildEvent(form, createStableId(), stops, days, tripEndDate)])
              setForm(initialForm(stops[0]!)); setAdding(false); setError(null)
            } catch (caught) { setError(caught instanceof Error ? caught.message : 'Invalid event') }
          }}>Add event</button>
        </article>
      )}
    </section>
  )
}
