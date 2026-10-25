import { useEffect, useState } from 'react'
import type { RouteStop, TravelLeg, TransportMode } from '../../types/trip'
import { TRANSPORT_MODES } from '../../types/trip'

interface TravelLegEditorProps {
  leg: TravelLeg
  from: RouteStop
  to: RouteStop
  onSave(leg: TravelLeg): void
}

export function TravelLegEditor({ leg, from, to, onSave }: TravelLegEditorProps) {
  const [draft, setDraft] = useState(leg)
  const [error, setError] = useState<string | null>(null)
  useEffect(() => setDraft(leg), [leg])

  function save() {
    if (draft.mapsUrl) {
      try {
        const protocol = new URL(draft.mapsUrl).protocol
        if (protocol !== 'http:' && protocol !== 'https:') throw new Error()
      } catch {
        setError('Directions URL must be a valid http or https address.')
        return
      }
    }
    setError(null)
    onSave({
      ...draft,
      transportMode: draft.transportMode || undefined,
      mapsUrl: draft.mapsUrl?.trim() || undefined,
      notes: draft.notes?.trim() || undefined,
    })
  }

  return (
    <details className="travel-leg">
      <summary><span>{from.city}</span><span className="leg-line">→</span><span>{to.city}</span><small>{draft.transportMode ?? 'Travel details'}</small></summary>
      <div className="form-grid two-columns leg-fields">
        <label>Transport mode
          <select value={draft.transportMode ?? ''} onChange={(event) => setDraft({ ...draft, transportMode: event.target.value ? event.target.value as TransportMode : undefined })}>
            <option value="">Not set</option>
            {TRANSPORT_MODES.map((mode) => <option key={mode} value={mode}>{mode}</option>)}
          </select>
        </label>
        <label>Directions URL<input type="url" placeholder="https://maps.google.com/…" value={draft.mapsUrl ?? ''} onChange={(event) => setDraft({ ...draft, mapsUrl: event.target.value })} /></label>
        <label className="full-width">Travel notes<textarea rows={2} value={draft.notes ?? ''} onChange={(event) => setDraft({ ...draft, notes: event.target.value })} /></label>
      </div>
      {error && <p className="form-error" role="alert">{error}</p>}
      <button className="button small" type="button" onClick={save}>Save leg</button>
    </details>
  )
}
