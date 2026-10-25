export interface History<T> {
  past: T[]
  present: T
  future: T[]
}

export function createHistory<T>(initial: T): History<T> {
  return { past: [], present: initial, future: [] }
}

export function pushHistory<T>(history: History<T>, next: T, limit: number): History<T> {
  if (!Number.isInteger(limit) || limit < 1) throw new RangeError('History limit must be a positive integer')
  return {
    past: [...history.past, history.present].slice(-limit),
    present: next,
    future: [],
  }
}

export function undoHistory<T>(history: History<T>): History<T> {
  if (history.past.length === 0) return history
  const previous = history.past[history.past.length - 1] as T
  return {
    past: history.past.slice(0, -1),
    present: previous,
    future: [history.present, ...history.future],
  }
}

export function redoHistory<T>(history: History<T>): History<T> {
  if (history.future.length === 0) return history
  const next = history.future[0] as T
  return {
    past: [...history.past, history.present],
    present: next,
    future: history.future.slice(1),
  }
}
