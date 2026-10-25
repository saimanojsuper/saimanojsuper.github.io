import type { TripStoreState } from './tripStore'

export const selectPlan = (state: TripStoreState) => state.history.present
export const selectCanUndo = (state: TripStoreState) => state.history.past.length > 0
export const selectCanRedo = (state: TripStoreState) => state.history.future.length > 0
export const selectUiState = (state: TripStoreState) => state.ui
export const selectHasRecoveryDraft = (state: TripStoreState) => state.hasRecoveryDraft

export const selectRecordedActivityCostInr = (state: TripStoreState): number =>
  state.history.present?.activities.reduce((total, activity) => total + (activity.costInr ?? 0), 0) ?? 0

export const selectBudgetRemainingInr = (state: TripStoreState): number | null => {
  const target = state.history.present?.budget.targetInr
  return target === undefined ? null : target - selectRecordedActivityCostInr(state)
}
