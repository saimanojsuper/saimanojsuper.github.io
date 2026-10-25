import { useStore } from 'zustand'
import { TripSetupWizard } from './features/setup/TripSetupWizard'
import { RouteTimeline } from './features/route/RouteTimeline'
import { selectPlan } from './store/selectors'
import { tripStore } from './store/tripStore'

export default function App() {
  const plan = useStore(tripStore, selectPlan)
  return plan ? <RouteTimeline plan={plan} /> : <TripSetupWizard />
}
