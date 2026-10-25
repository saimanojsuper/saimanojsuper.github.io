import { cleanup, fireEvent, render, screen } from '@testing-library/react'
import { afterEach, beforeEach, describe, expect, it } from 'vitest'
import { createHistory } from '../../store/history'
import { tripStore } from '../../store/tripStore'
import { TripSetupWizard } from './TripSetupWizard'

beforeEach(() => {
  window.localStorage.clear()
  tripStore.setState({
    history: createHistory(null),
    ui: { isDirty: false, lastStorageError: null },
    hasRecoveryDraft: false,
  })
})

afterEach(() => {
  cleanup()
  window.localStorage.clear()
})

describe('TripSetupWizard', () => {
  it('blocks incomplete routes, then creates a contiguous multi-city trip', () => {
    render(<TripSetupWizard />)

    fireEvent.click(screen.getByRole('button', { name: 'Continue' }))
    expect(screen.getByRole('alert')).toHaveTextContent('Give every route stop a city name.')

    const destinations = screen.getAllByPlaceholderText('City or destination')
    fireEvent.change(destinations[0]!, { target: { value: 'Delhi' } })
    fireEvent.change(destinations[1]!, { target: { value: 'Agra' } })
    fireEvent.click(screen.getByRole('button', { name: 'Continue' }))

    fireEvent.change(screen.getByLabelText('Trip title'), { target: { value: 'Golden Triangle' } })
    fireEvent.click(screen.getByRole('button', { name: 'Continue' }))
    fireEvent.click(screen.getByRole('button', { name: 'Create trip' }))

    const plan = tripStore.getState().history.present
    expect(plan?.metadata.title).toBe('Golden Triangle')
    expect(plan?.routeStops.map((stop) => stop.city)).toEqual(['Delhi', 'Agra'])
    expect(plan?.days).toHaveLength(3)
    expect(plan?.days.map((day) => day.date)).toEqual([
      plan?.metadata.startDate,
      plan?.routeStops[0]?.endDate,
      plan?.metadata.endDate,
    ])
    expect(plan?.days.map((day) => day.dayNumber)).toEqual([1, 2, 3])
  })
})
