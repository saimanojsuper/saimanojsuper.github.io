import { describe, expect, it } from 'vitest'
import { LOCAL_DRAFT_STORAGE_KEY } from '../constants/schema'
import { createValidPlan } from '../test/fixtures'
import { createLocalDraftStorage, type StorageLike } from './localDraftStorage'

class MemoryStorage implements StorageLike {
  readonly values = new Map<string, string>()
  getItem(key: string) { return this.values.get(key) ?? null }
  setItem(key: string, value: string) { this.values.set(key, value) }
  removeItem(key: string) { this.values.delete(key) }
}

describe('local draft storage', () => {
  it('round-trips a validated plan and clears it', () => {
    const backing = new MemoryStorage()
    const drafts = createLocalDraftStorage(backing)
    drafts.save(createValidPlan())
    expect(drafts.load()?.metadata.title).toBe('Golden Triangle')
    drafts.clear()
    expect(drafts.load()).toBeNull()
  })

  it('does not recover malformed JSON or an invalid plan', () => {
    const backing = new MemoryStorage()
    const drafts = createLocalDraftStorage(backing)
    backing.values.set(LOCAL_DRAFT_STORAGE_KEY, '{nope')
    expect(drafts.load()).toBeNull()
    backing.values.set(LOCAL_DRAFT_STORAGE_KEY, JSON.stringify({ schemaVersion: 1 }))
    expect(drafts.load()).toBeNull()
  })
})
