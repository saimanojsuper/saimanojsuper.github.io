import { describe, expect, it, vi } from 'vitest'
import type { DraftStorage } from '../services/localDraftStorage'
import { createValidPlan } from '../test/fixtures'
import { createTripStore } from './tripStore'

describe('trip store', () => {
  it('persists edits and supports bounded undo/redo', () => {
    const storage: DraftStorage = { load: vi.fn(() => null), save: vi.fn(), clear: vi.fn() }
    const store = createTripStore({ draftStorage: storage, historyLimit: 2 })
    store.getState().replacePlan(createValidPlan())
    store.getState().updatePlan((plan) => ({
      ...plan,
      metadata: { ...plan.metadata, title: 'Edited once' },
    }))

    expect(storage.save).toHaveBeenCalledTimes(2)
    expect(store.getState().history.present?.metadata.title).toBe('Edited once')
    store.getState().undo()
    expect(store.getState().history.present?.metadata.title).toBe('Golden Triangle')
    store.getState().redo()
    expect(store.getState().history.present?.metadata.title).toBe('Edited once')
  })

  it('restores a recovery draft while keeping UI state outside the plan', () => {
    const recovered = createValidPlan()
    const storage: DraftStorage = { load: () => recovered, save: vi.fn(), clear: vi.fn() }
    const store = createTripStore({ draftStorage: storage })
    store.getState().setUiState({ isDirty: true })

    expect(store.getState().history.present).toEqual(recovered)
    expect(store.getState().hasRecoveryDraft).toBe(true)
    expect(store.getState().history.present).not.toHaveProperty('ui')
  })

  it('keeps in-memory edits when persistence fails and exposes the error', () => {
    const storage: DraftStorage = {
      load: () => null,
      save: () => { throw new Error('quota exceeded') },
      clear: vi.fn(),
    }
    const store = createTripStore({ draftStorage: storage })
    store.getState().replacePlan(createValidPlan())

    expect(store.getState().history.present?.metadata.id).toBe('trip-1')
    expect(store.getState().ui.lastStorageError).toBe('quota exceeded')
  })
})
