import {
  calculateBudgetSnapshot,
  calculateRecordedActivityCostInr,
  calculateRecordedFoodCostInr,
} from '../domain/budget'
import type { TripStoreState } from './tripStore'

export const selectPlan = (state: TripStoreState) => state.history.present
export const selectCanUndo = (state: TripStoreState) => state.history.past.length > 0
export const selectCanRedo = (state: TripStoreState) => state.history.future.length > 0
export const selectUiState = (state: TripStoreState) => state.ui
export const selectHasRecoveryDraft = (state: TripStoreState) => state.hasRecoveryDraft

export const selectRecordedActivityCostInr = (state: TripStoreState): number =>
  state.history.present ? calculateRecordedActivityCostInr(state.history.present.activities) : 0

export const selectRecordedFoodCostInr = (state: TripStoreState): number =>
  state.history.present ? calculateRecordedFoodCostInr(state.history.present.foodEntries) : 0

export const selectRecordedTripCostInr = (state: TripStoreState): number =>
  selectRecordedActivityCostInr(state) + selectRecordedFoodCostInr(state)

export const selectBudgetRemainingInr = (state: TripStoreState): number | null =>
  state.history.present ? calculateBudgetSnapshot(state.history.present).remainingInr : null
