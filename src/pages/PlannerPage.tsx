import { useState } from 'react'
import { PlannerLayout, type PlannerSection } from '../components/layout/PlannerLayout'
import { StickyRoutePanel } from '../components/layout/StickyRoutePanel'
import { ItineraryBoard } from '../features/itinerary/ItineraryBoard'
import { RouteTimeline } from '../features/route/RouteTimeline'
import type { TripPlan } from '../types/trip'

export function PlannerPage({ plan }: { plan: TripPlan }) {
  const [activeSection, setActiveSection] = useState<PlannerSection>('itinerary')

  function showDay(dayNumber: number) {
    setActiveSection('itinerary')
    window.setTimeout(() => document.getElementById(`day-${dayNumber}`)?.scrollIntoView({ behavior: 'smooth', block: 'start' }))
  }

  const routePanel = <StickyRoutePanel plan={plan} onDay={showDay} />
  return (
    <PlannerLayout plan={plan} activeSection={activeSection} onSectionChange={setActiveSection} routePanel={routePanel}>
      {activeSection === 'route' ? <RouteTimeline plan={plan} /> : <ItineraryBoard plan={plan} />}
    </PlannerLayout>
  )
}
