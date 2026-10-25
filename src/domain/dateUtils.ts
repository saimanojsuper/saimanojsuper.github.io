const ISO_DATE_PATTERN = /^\d{4}-\d{2}-\d{2}$/

export function isIsoDate(value: string): boolean {
  if (!ISO_DATE_PATTERN.test(value)) return false
  const date = new Date(`${value}T00:00:00Z`)
  return !Number.isNaN(date.getTime()) && date.toISOString().slice(0, 10) === value
}

export function addDays(date: string, amount: number): string {
  if (!isIsoDate(date)) throw new RangeError(`Invalid ISO date: ${date}`)
  const result = new Date(`${date}T00:00:00Z`)
  result.setUTCDate(result.getUTCDate() + amount)
  return result.toISOString().slice(0, 10)
}

export function daysInclusive(startDate: string, endDate: string): number {
  if (!isIsoDate(startDate) || !isIsoDate(endDate) || endDate < startDate) {
    throw new RangeError('Expected an ordered ISO date range')
  }
  const start = Date.parse(`${startDate}T00:00:00Z`)
  const end = Date.parse(`${endDate}T00:00:00Z`)
  return Math.round((end - start) / 86_400_000) + 1
}

export function enumerateDates(startDate: string, endDate: string): string[] {
  const count = daysInclusive(startDate, endDate)
  return Array.from({ length: count }, (_, index) => addDays(startDate, index))
}

export function toOffsetIso(localDateTime: string): string {
  const match = /^(\d{4}-\d{2}-\d{2})T(([01]\d|2[0-3]):[0-5]\d)$/.exec(localDateTime)
  if (!match || !isIsoDate(match[1]!)) throw new RangeError('Expected a local date-time')
  const offsetMinutes = -new Date().getTimezoneOffset()
  const sign = offsetMinutes >= 0 ? '+' : '-'
  const absolute = Math.abs(offsetMinutes)
  const hours = String(Math.floor(absolute / 60)).padStart(2, '0')
  const minutes = String(absolute % 60).padStart(2, '0')
  return `${match[1]}T${match[2]}:00${sign}${hours}:${minutes}`
}
