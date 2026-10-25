import { ZodError } from 'zod'

export function userFacingError(error: unknown, fallback: string): string {
  if (error instanceof ZodError) {
    return error.issues
      .slice(0, 3)
      .map((issue) => `${issue.path.join('.') || 'plan'}: ${issue.message}`)
      .join(' · ')
  }
  return error instanceof Error ? error.message : fallback
}
