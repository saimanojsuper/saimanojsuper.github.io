import { LOCAL_DRAFT_STORAGE_KEY } from '../constants/schema'
import { tripPlanSchema } from '../schemas/tripSchema'
import type { TripPlan } from '../types/trip'

export interface StorageLike {
  getItem(key: string): string | null
  setItem(key: string, value: string): void
  removeItem(key: string): void
}

export interface DraftStorage {
  load(): TripPlan | null
  save(plan: TripPlan): void
  clear(): void
}

export function createLocalDraftStorage(storage?: StorageLike | null): DraftStorage {
  return {
    load() {
      if (!storage) return null
      try {
        const serialized = storage.getItem(LOCAL_DRAFT_STORAGE_KEY)
        if (!serialized) return null
        const parsed: unknown = JSON.parse(serialized)
        const result = tripPlanSchema.safeParse(parsed)
        return result.success ? result.data : null
      } catch {
        return null
      }
    },
    save(plan) {
      if (!storage) return
      storage.setItem(LOCAL_DRAFT_STORAGE_KEY, JSON.stringify(plan))
    },
    clear() {
      if (!storage) return
      storage.removeItem(LOCAL_DRAFT_STORAGE_KEY)
    },
  }
}

export function getBrowserDraftStorage(): DraftStorage {
  let storage: StorageLike | null = null
  try {
    storage = typeof window === 'undefined' ? null : window.localStorage
  } catch {
    // Access itself can throw when storage is disabled by browser policy.
  }
  return createLocalDraftStorage(storage)
}
