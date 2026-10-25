import { useEffect, useState } from 'react'
import { useStore } from 'zustand'
import { addDays } from '../../domain/dateUtils'
import { userFacingError } from '../../domain/errorMessage'
import { extendTripEndDate } from '../../domain/tripExtension'
import { tripStore } from '../../store/tripStore'
import type { TripPlan } from '../../types/trip'

export function TripDurationEditor({ plan }: { plan: TripPlan }) {
  const replacePlan = useStore(tripStore, (state) => state.replacePlan)
  const [endDate, setEndDate] = useState(plan.metadata.endDate)
  const [error, setError] = useState<string | null>(null)
  useEffect(() => setEndDate(plan.metadata.endDate), [plan.metadata.endDate])

  function extend() {
    try {
      replacePlan(extendTripEndDate(plan, endDate, new Date().toISOString()))
      setError(null)
    } catch (caught) {
      setError(userFacingError(caught, 'Trip could not be extended.'))
    }
  }

  return (
    <section className="trip-extension">
      <div><strong>Extend this trip</strong><p>New days are added to the final destination. Existing activities stay put.</p></div>
      <div className="extension-controls">
        <label>New end date<input type="date" min={addDays(plan.metadata.endDate, 1)} value={endDate} onChange={(event) => setEndDate(event.target.value)} /></label>
        <button className="button small" type="button" disabled={endDate <= plan.metadata.endDate} onClick={extend}>Extend trip</button>
      </div>
      {error && <p className="form-error" role="alert">{error}</p>}
    </section>
  )
}
