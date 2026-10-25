import type { TripPlan } from '../../types/trip'

function RouteContents({ plan, onDay }: { plan: TripPlan; onDay(dayNumber: number): void }) {
  const stops = [...plan.routeStops].sort((left, right) => left.order - right.order)
  return (
    <>
      <div className="route-summary-head"><p className="eyebrow">Route at a glance</p><strong>{plan.days.length} days</strong></div>
      <ol className="route-summary-list">
        {stops.map((stop) => {
          const stopDays = plan.days.filter((day) => day.routeStopId === stop.id).sort((a, b) => a.dayNumber - b.dayNumber)
          return (
            <li key={stop.id}>
              <span className="route-dot" />
              <div><strong>{stop.city}</strong><small>{stop.startDate} – {stop.endDate}</small>
                <div className="summary-day-links">{stopDays.map((day) => <button key={day.id} type="button" onClick={() => onDay(day.dayNumber)}>Day {day.dayNumber}</button>)}</div>
              </div>
            </li>
          )
        })}
      </ol>
    </>
  )
}

export function StickyRoutePanel({ plan, onDay }: { plan: TripPlan; onDay(dayNumber: number): void }) {
  return <aside className="sticky-route-panel"><RouteContents plan={plan} onDay={onDay} /></aside>
}
