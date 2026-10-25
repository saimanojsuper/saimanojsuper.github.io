import { cleanup, fireEvent, render, screen, within } from '@testing-library/react'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import App from '../App'
import { createHistory } from '../store/history'
import { tripStore } from '../store/tripStore'
import { createValidPlan } from '../test/fixtures'
import type { FoodEntry, TripPlan } from '../types/trip'

function food(overrides: Partial<FoodEntry>): FoodEntry {
  return {
    id: 'food-test',
    routeStopId: 'stop-delhi',
    dish: 'Delhi food',
    mealType: 'lunch',
    priority: 'high',
    status: 'planned',
    ...overrides,
  }
}

function installPlan(plan: TripPlan = createValidPlan()) {
  tripStore.setState({
    history: createHistory(plan),
    ui: { isDirty: false, lastStorageError: null },
    hasRecoveryDraft: true,
  })
}

beforeEach(() => {
  window.localStorage.clear()
  installPlan()
})

afterEach(() => {
  cleanup()
  vi.restoreAllMocks()
  window.localStorage.clear()
})

describe('food planner UI', () => {
  it('navigates to Food and performs add, edit, status, duplicate, and delete as one-step store mutations', () => {
    vi.spyOn(window, 'confirm').mockReturnValue(true)
    render(<App />)

    fireEvent.click(screen.getByRole('button', { name: 'Food' }))
    expect(screen.getByRole('heading', { name: 'Food planner' })).toBeInTheDocument()

    fireEvent.click(screen.getByRole('button', { name: '+ Add food' }))
    expect(screen.getByRole('dialog', { name: 'Add must-taste item' })).toBeInTheDocument()
    fireEvent.change(screen.getByLabelText('Dish or food item'), { target: { value: '  Chole bhature  ' } })
    fireEvent.change(screen.getByLabelText('Day optional'), { target: { value: 'day-1' } })
    fireEvent.change(screen.getByLabelText('Estimated cost in INR optional'), { target: { value: '350' } })
    fireEvent.click(screen.getByRole('button', { name: 'Save food' }))

    expect(tripStore.getState().history.past).toHaveLength(1)
    expect(tripStore.getState().history.present?.foodEntries).toEqual(expect.arrayContaining([
      expect.objectContaining({
        dish: 'Chole bhature',
        routeStopId: 'stop-delhi',
        dayId: 'day-1',
        estimatedCostInr: 350,
      }),
    ]))

    let card = screen.getByRole('heading', { name: 'Chole bhature' }).closest('article')!
    fireEvent.click(within(card).getByRole('button', { name: 'Edit' }))
    fireEvent.change(screen.getByLabelText('Dish or food item'), { target: { value: 'Chole kulche' } })
    fireEvent.change(screen.getByLabelText('Restaurant optional'), { target: { value: '  Sita Ram  ' } })
    fireEvent.click(screen.getByRole('button', { name: 'Save food' }))

    expect(tripStore.getState().history.past).toHaveLength(2)
    expect(tripStore.getState().history.present?.foodEntries.find((entry) => entry.dish === 'Chole kulche')).toMatchObject({
      restaurant: 'Sita Ram',
      status: 'planned',
    })

    fireEvent.change(screen.getByLabelText('Status for Chole kulche'), { target: { value: 'done' } })
    expect(tripStore.getState().history.past).toHaveLength(3)
    expect(tripStore.getState().history.present?.foodEntries.find((entry) => entry.dish === 'Chole kulche')?.status).toBe('done')

    card = screen.getByRole('heading', { name: 'Chole kulche' }).closest('article')!
    fireEvent.click(within(card).getByRole('button', { name: 'Duplicate' }))
    expect(tripStore.getState().history.past).toHaveLength(4)
    expect(screen.getByRole('heading', { name: 'Chole kulche (copy)' })).toBeInTheDocument()
    expect(screen.getByLabelText('Status for Chole kulche (copy)')).toHaveValue('planned')

    const copyCard = screen.getByRole('heading', { name: 'Chole kulche (copy)' }).closest('article')!
    fireEvent.click(within(copyCard).getByRole('button', { name: 'Delete' }))
    expect(window.confirm).toHaveBeenCalledWith('Delete “Chole kulche (copy)”?')
    expect(tripStore.getState().history.past).toHaveLength(5)
    expect(screen.queryByRole('heading', { name: 'Chole kulche (copy)' })).not.toBeInTheDocument()
  })

  it('filters by destination and day, including destination-wide food in day context', () => {
    const plan = createValidPlan()
    plan.foodEntries.push(
      food({ id: 'delhi-any', dish: 'Delhi-wide', dayId: undefined }),
      food({ id: 'delhi-one', dish: 'Day one dish', dayId: 'day-1' }),
      food({ id: 'delhi-two', dish: 'Day two dish', dayId: 'day-2' }),
    )
    installPlan(plan)
    render(<App />)
    fireEvent.click(screen.getByRole('button', { name: 'Food' }))

    fireEvent.change(screen.getByLabelText('Destination'), { target: { value: 'stop-delhi' } })
    expect(screen.getByRole('heading', { name: 'Delhi-wide' })).toBeInTheDocument()
    expect(screen.getByRole('heading', { name: 'Day one dish' })).toBeInTheDocument()
    expect(screen.queryByRole('heading', { name: 'Petha' })).not.toBeInTheDocument()

    fireEvent.change(screen.getByLabelText('Day'), { target: { value: 'day-1' } })
    expect(screen.getByText('Includes items for this day and destination-wide ideas.')).toBeInTheDocument()
    expect(screen.getByRole('heading', { name: 'Delhi-wide' })).toBeInTheDocument()
    expect(screen.getByRole('heading', { name: 'Day one dish' })).toBeInTheDocument()
    expect(screen.queryByRole('heading', { name: 'Day two dish' })).not.toBeInTheDocument()
  })

  it('surfaces day-specific and destination-wide food in the relevant itinerary day only', () => {
    const plan = createValidPlan()
    plan.foodEntries.push(
      food({ id: 'delhi-any', dish: 'Delhi-wide', dayId: undefined }),
      food({ id: 'delhi-two', dish: 'Day two dish', dayId: 'day-2' }),
    )
    installPlan(plan)
    render(<App />)

    const dayOne = screen.getByLabelText('Must-taste items for day 1')
    const dayTwo = screen.getByLabelText('Must-taste items for day 2')
    expect(within(dayOne).getByText('Delhi-wide')).toBeInTheDocument()
    expect(within(dayOne).queryByText('Day two dish')).not.toBeInTheDocument()
    expect(within(dayTwo).getByText('Delhi-wide')).toBeInTheDocument()
    expect(within(dayTwo).getByText('Day two dish')).toBeInTheDocument()
    expect(screen.getByLabelText('Must-taste items for day 3')).toHaveTextContent('Petha')
  })
})

describe('budget UI', () => {
  it('shows activity, food, combined, remaining, and progress values and saves an over-budget target', () => {
    const plan = createValidPlan()
    plan.budget.targetInr = 1_000
    installPlan(plan)
    render(<App />)

    fireEvent.click(screen.getByRole('button', { name: 'Budget' }))
    expect(screen.getByRole('heading', { name: 'Trip budget' })).toBeInTheDocument()

    const activityCard = screen.getByText('Activity costs').closest('article')!
    const foodCard = screen.getByText('Food estimates').closest('article')!
    const combinedCard = screen.getByText('Combined spent / planned').closest('article')!
    const remainingCard = screen.getByText('Remaining').closest('article')!
    expect(within(activityCard).getByText('₹600')).toBeInTheDocument()
    expect(within(foodCard).getByText('₹250')).toBeInTheDocument()
    expect(within(combinedCard).getByText('₹850')).toBeInTheDocument()
    expect(within(remainingCard).getByText('₹150')).toBeInTheDocument()
    expect(screen.getByLabelText('85 percent of budget used')).toBeInTheDocument()
    expect(screen.getByText(/The combined total includes all INR costs recorded on itinerary activities/)).toHaveTextContent(
      'plus all estimated INR costs in the food planner, regardless of planned, done, or skipped status.',
    )

    fireEvent.change(screen.getByLabelText('Total trip budget in INR'), { target: { value: '500' } })
    fireEvent.click(screen.getByRole('button', { name: 'Save target' }))

    const state = tripStore.getState()
    expect(state.history.past).toHaveLength(1)
    expect(state.history.present?.budget.targetInr).toBe(500)
    const overCard = screen.getByText('Over budget').closest('article')!
    expect(within(overCard).getByText('₹350')).toBeInTheDocument()
    expect(screen.getByLabelText('100 percent of budget used')).toBeInTheDocument()
  })

  it('reports an invalid target without mutating history', () => {
    render(<App />)
    fireEvent.click(screen.getByRole('button', { name: 'Budget' }))
    fireEvent.change(screen.getByLabelText('Total trip budget in INR'), { target: { value: '-1' } })
    fireEvent.click(screen.getByRole('button', { name: 'Save target' }))

    expect(screen.getByRole('alert')).toHaveTextContent('Budget target must be a nonnegative INR value')
    expect(tripStore.getState().history.past).toHaveLength(0)
    expect(tripStore.getState().history.present?.budget.targetInr).toBe(20_000)
  })
})
