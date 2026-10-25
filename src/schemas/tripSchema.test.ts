import { describe, expect, it } from 'vitest'
import { createValidPlan } from '../test/fixtures'
import { tripPlanSchema } from './tripSchema'

describe('tripPlanSchema', () => {
  it('accepts a complete, internally consistent plan', () => {
    expect(tripPlanSchema.safeParse(createValidPlan()).success).toBe(true)
  })

  it('rejects bad ranges, references, costs, and URL protocols', () => {
    const plan = createValidPlan()
    plan.metadata.endDate = '2026-10-31'
    plan.activities[0]!.dayId = 'missing-day'
    plan.activities[0]!.costInr = -1
    plan.travelLegs[0]!.mapsUrl = 'javascript:alert(1)'

    const result = tripPlanSchema.safeParse(plan)
    expect(result.success).toBe(false)
    if (!result.success) {
      const paths = result.error.issues.map((issue) => issue.path.join('.'))
      expect(paths).toContain('metadata.endDate')
      expect(paths).toContain('activities.0.dayId')
      expect(paths).toContain('activities.0.costInr')
      expect(paths).toContain('travelLegs.0.mapsUrl')
    }
  })

  it('rejects mismatched stop/day relationships and malformed dates or times', () => {
    const plan = createValidPlan()
    plan.activities[0]!.routeStopId = 'stop-agra'
    plan.days[0]!.date = '01/11/2026'
    plan.activities[0]!.startTime = '9am'

    expect(tripPlanSchema.safeParse(plan).success).toBe(false)
  })
})
