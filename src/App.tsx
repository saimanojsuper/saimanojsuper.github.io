import { useStore } from 'zustand'
import { TripSetupWizard } from './features/setup/TripSetupWizard'
import { PlannerPage } from './pages/PlannerPage'
import { selectPlan } from './store/selectors'
import { tripStore } from './store/tripStore'

export default function App() {
  const plan = useStore(tripStore, selectPlan)
  return plan ? <PlannerPage plan={plan} /> : <TripSetupWizard />
}
