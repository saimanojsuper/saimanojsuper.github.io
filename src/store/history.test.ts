import { describe, expect, it } from 'vitest'
import { createHistory, pushHistory, redoHistory, undoHistory } from './history'

describe('bounded history', () => {
  it('undoes, redoes, and clears the redo branch on a new edit', () => {
    let history = createHistory('a')
    history = pushHistory(history, 'b', 5)
    history = pushHistory(history, 'c', 5)

    history = undoHistory(history)
    expect(history.present).toBe('b')
    expect(history.future).toEqual(['c'])

    history = redoHistory(history)
    expect(history.present).toBe('c')

    history = undoHistory(history)
    history = pushHistory(history, 'd', 5)
    expect(history.future).toEqual([])
    expect(history.present).toBe('d')
  })

  it('retains only the configured number of past snapshots', () => {
    let history = createHistory(0)
    history = pushHistory(history, 1, 2)
    history = pushHistory(history, 2, 2)
    history = pushHistory(history, 3, 2)
    expect(history.past).toEqual([1, 2])
  })
})
