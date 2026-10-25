import { useEffect, useState } from 'react'

export function BudgetTargetEditor({ targetInr, onSave }: { targetInr?: number | undefined; onSave(target?: number | undefined): void }) {
  const [value, setValue] = useState(targetInr?.toString() ?? '')
  useEffect(() => setValue(targetInr?.toString() ?? ''), [targetInr])
  return (
    <div className="budget-target-editor">
      <label>Total trip budget in INR<input type="number" min="0" step="1" placeholder="e.g. 75000" value={value} onChange={(event) => setValue(event.target.value)} /></label>
      <button className="button" type="button" onClick={() => onSave(value === '' ? undefined : Number(value))}>{value === '' ? 'Clear target' : 'Save target'}</button>
    </div>
  )
}
