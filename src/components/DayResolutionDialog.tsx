import { useState } from 'react'
import { resolutionKey, type DayResolutionSelections } from '../domain/dateChangeResolver'
import type { RouteChangeDraft } from '../domain/routeMutations'

interface DayResolutionDialogProps {
  draft: RouteChangeDraft
  onCancel(): void
  onResolve(selections: DayResolutionSelections): void
}

export function DayResolutionDialog({ draft, onCancel, onResolve }: DayResolutionDialogProps) {
  const [selections, setSelections] = useState<DayResolutionSelections>({})
  const complete = draft.requiredDayChanges.every((change) => selections[resolutionKey(change)])

  return (
    <div className="modal-backdrop" role="presentation">
      <section className="modal" role="dialog" aria-modal="true" aria-labelledby="resolution-title">
        <p className="eyebrow">Schedule changed</p>
        <h2 id="resolution-title">Choose replacement days</h2>
        <p>These saved items lost their original day. Nothing moves until every replacement is selected.</p>
        <div className="resolution-list">
          {draft.requiredDayChanges.map((change) => {
            const changeKey = resolutionKey(change)
            return (
              <label key={changeKey}>
                <span><strong>{change.label}</strong> <small>({change.recordType})</small></span>
                <select
                  value={selections[changeKey] ?? ''}
                  onChange={(event) => setSelections((current) => ({ ...current, [changeKey]: event.target.value }))}
                >
                  <option value="">Select a new day</option>
                  {change.candidateDays.map((day) => (
                    <option key={day.id} value={day.id}>Day {day.dayNumber} · {day.date}</option>
                  ))}
                </select>
              </label>
            )
          })}
        </div>
        <div className="actions">
          <button className="button secondary" type="button" onClick={onCancel}>Cancel route change</button>
          <button className="button" type="button" disabled={!complete} onClick={() => onResolve(selections)}>Apply moves</button>
        </div>
      </section>
    </div>
  )
}
