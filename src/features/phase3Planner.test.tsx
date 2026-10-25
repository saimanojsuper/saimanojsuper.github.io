import { DndContext } from '@dnd-kit/core'
import { cleanup, fireEvent, render, screen, within } from '@testing-library/react'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { createHistory } from '../store/history'
import { tripStore } from '../store/tripStore'
import { createValidPlan } from '../test/fixtures'
import type { Activity } from '../types/trip'
import { ActivityCard } from './activities/ActivityCard'
import { ActivityEditor } from './activities/ActivityEditor'
import { ItineraryBoard } from './itinerary/ItineraryBoard'
import { PlannerPage } from '../pages/PlannerPage'
import { RouteTimeline } from './route/RouteTimeline'

beforeEach(() => {
  window.localStorage.clear()
  tripStore.setState({
    history: createHistory(createValidPlan()),
    ui: { isDirty: false, lastStorageError: null },
    hasRecoveryDraft: true,
  })
})

afterEach(() => {
  cleanup()
  window.localStorage.clear()
})

describe('activity UI', () => {
  it('shows activity details and wires status, edit, duplicate, and delete controls', () => {
    const onStatus = vi.fn()
    const onEdit = vi.fn()
    const onDuplicate = vi.fn()
    const onDelete = vi.fn()
    const activity: Activity = {
      ...createValidPlan().activities[0]!,
      endTime: '11:00',
      notes: 'Bring water',
      status: 'planned',
    }

    render(
      <DndContext>
        <ActivityCard
          activity={activity}
          hasConflict
          onStatus={onStatus}
          onEdit={onEdit}
          onDuplicate={onDuplicate}
          onDelete={onDelete}
        />
      </DndContext>,
    )

    expect(screen.getByRole('heading', { name: 'See Humayun’s Tomb' })).toBeInTheDocument()
    expect(screen.getByText('09:00–11:00')).toBeInTheDocument()
    expect(screen.getByText('Time overlaps another activity on this day.')).toHaveAttribute('role', 'status')
    expect(screen.getByRole('link', { name: 'Open place ↗' })).toHaveAttribute('href', activity.mapsUrl)

    fireEvent.change(screen.getByLabelText('Status for See Humayun’s Tomb'), { target: { value: 'done' } })
    fireEvent.click(screen.getByRole('button', { name: 'Edit See Humayun’s Tomb' }))
    fireEvent.click(screen.getByRole('button', { name: 'Duplicate See Humayun’s Tomb' }))
    fireEvent.click(screen.getByRole('button', { name: 'Delete See Humayun’s Tomb' }))

    expect(onStatus).toHaveBeenCalledWith('done')
    expect(onEdit).toHaveBeenCalledOnce()
    expect(onDuplicate).toHaveBeenCalledOnce()
    expect(onDelete).toHaveBeenCalledOnce()
  })

  it('edits fields, trims optional text, and derives the route stop from the selected day', () => {
    const plan = createValidPlan()
    const onSave = vi.fn()
    render(
      <ActivityEditor
        activity={plan.activities[0]!}
        days={plan.days}
        title="Edit activity"
        onCancel={vi.fn()}
        onSave={onSave}
      />,
    )

    fireEvent.change(screen.getByLabelText('Title'), { target: { value: '  Agra Fort  ' } })
    fireEvent.change(screen.getByLabelText('Day'), { target: { value: 'day-3' } })
    fireEvent.change(screen.getByLabelText('Time of day'), { target: { value: 'evening' } })
    fireEvent.change(screen.getByLabelText('Status'), { target: { value: 'done' } })
    fireEvent.change(screen.getByLabelText(/Notes/), { target: { value: '  Sunset visit  ' } })
    fireEvent.click(screen.getByRole('button', { name: 'Save activity' }))

    expect(onSave).toHaveBeenCalledWith(expect.objectContaining({
      title: 'Agra Fort',
      dayId: 'day-3',
      routeStopId: 'stop-agra',
      slot: 'evening',
      status: 'done',
      notes: 'Sunset visit',
    }))
  })
})

describe('departure-driven trip extension', () => {
  function planWithDeparture() {
    const plan = createValidPlan()
    plan.arrivalDepartureEvents.push({
      id: 'departure-1',
      routeStopId: 'stop-agra',
      dayId: 'day-3',
      type: 'departure',
      place: 'Departure station',
      dateTime: '2026-11-03T17:30:00+05:30',
    })
    return plan
  }

  function departureCard() {
    return screen.getByDisplayValue('Departure station').closest('article')!
  }

  function departurePicker(card: HTMLElement): HTMLInputElement {
    return card.querySelector('input[type="datetime-local"]')!
  }

  it('extends through the final-stop departure picker in one store transaction and refreshes the picker', () => {
    const plan = planWithDeparture()
    tripStore.setState({ history: createHistory(plan) })
    render(<RouteTimeline plan={plan} />)

    const card = departureCard()
    const picker = departurePicker(card)
    expect(picker).not.toHaveAttribute('max')

    fireEvent.change(picker, { target: { value: '2026-11-06T18:45' } })
    fireEvent.click(within(card).getByRole('button', { name: 'Save event' }))

    const history = tripStore.getState().history
    const saved = history.present!
    expect(history.past).toHaveLength(1)
    expect(saved.metadata.endDate).toBe('2026-11-06')
    expect(saved.routeStops.at(-1)).toMatchObject({ id: 'stop-agra', endDate: '2026-11-06' })
    expect(saved.days.slice(0, 3).map((day) => day.id)).toEqual(plan.days.map((day) => day.id))
    expect(saved.days.map((day) => day.date)).toEqual([
      '2026-11-01',
      '2026-11-02',
      '2026-11-03',
      '2026-11-04',
      '2026-11-05',
      '2026-11-06',
    ])
    expect(saved.activities).toEqual(plan.activities)
    expect(saved.arrivalDepartureEvents.find((event) => event.type === 'arrival')).toMatchObject({
      routeStopId: 'stop-delhi',
      dayId: 'day-1',
      dateTime: '2026-11-01T09:15:00+05:30',
    })
    expect(saved.arrivalDepartureEvents.find((event) => event.type === 'departure')).toMatchObject({
      routeStopId: 'stop-agra',
      dayId: 'day:stop-agra:2026-11-06',
      dateTime: expect.stringMatching(/^2026-11-06T18:45:00[+-]\d{2}:\d{2}$/),
    })

    cleanup()
    render(<RouteTimeline plan={saved} />)
    const refreshedPicker = departurePicker(departureCard())
    expect(refreshedPicker).toHaveValue('2026-11-06T18:45')
    expect(refreshedPicker).toHaveAttribute('min', '2026-11-03T00:00')
    expect(refreshedPicker).not.toHaveAttribute('max')
    expect(screen.getByText('Dates after 2026-11-06 extend the final destination automatically.')).toBeInTheDocument()
  })

  it.each([
    ['before the final stop starts', 'stop-agra', '2026-11-02T08:00'],
    ['outside its selected non-final stop', 'stop-delhi', '2026-11-03T08:00'],
  ])('rejects a departure %s without adding history or mutating store state', (_case, routeStopId, dateTime) => {
    const plan = planWithDeparture()
    const snapshot = structuredClone(plan)
    tripStore.setState({ history: createHistory(plan) })
    render(<RouteTimeline plan={plan} />)

    const card = departureCard()
    fireEvent.change(within(card).getByLabelText('Destination'), { target: { value: routeStopId } })
    fireEvent.change(departurePicker(card), { target: { value: dateTime } })
    fireEvent.click(within(card).getByRole('button', { name: 'Save event' }))

    expect(within(card).getByRole('alert')).toHaveTextContent(
      'Event date must be inside its destination dates; only a final departure may extend the trip.',
    )
    expect(tripStore.getState().history.past).toHaveLength(0)
    expect(tripStore.getState().history.present).toEqual(snapshot)
  })
})

describe('planner itinerary UI', () => {
  it('commits status and day-note/leisure changes through the planner store', () => {
    const plan = createValidPlan()
    render(<ItineraryBoard plan={plan} />)

    fireEvent.change(screen.getByLabelText('Status for See Humayun’s Tomb'), { target: { value: 'done' } })
    expect(tripStore.getState().history.present?.activities[0]?.status).toBe('done')

    // Re-render with the committed plan, just as the subscribed application shell does.
    cleanup()
    const current = tripStore.getState().history.present!
    render(<ItineraryBoard plan={current} />)
    const notes = screen.getAllByLabelText('Day notes')[0]!
    const firstDay = notes.closest('article')!
    fireEvent.change(notes, { target: { value: '  Keep passport handy  ' } })
    const saveNotes = screen.getAllByRole('button', { name: 'Save notes' }).find((button) => firstDay.contains(button))!
    fireEvent.click(saveNotes)

    expect(tripStore.getState().history.present?.days[0]).toMatchObject({
      notes: 'Keep passport handy',
      isLeisure: false,
    })
  })

  it('switches between the itinerary and route workspaces and exposes trip extension controls', () => {
    const plan = createValidPlan()
    render(<PlannerPage plan={plan} />)

    expect(screen.getByRole('heading', { name: 'Itinerary' })).toBeInTheDocument()
    fireEvent.click(screen.getByRole('button', { name: 'Route' }))

    expect(screen.getByRole('heading', { name: 'Destinations & travel' })).toBeInTheDocument()
    expect(screen.getByLabelText('New end date')).toHaveAttribute('min', '2026-11-04')
    expect(screen.getByRole('button', { name: 'Extend trip' })).toBeDisabled()
  })
})
