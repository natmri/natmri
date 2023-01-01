import { assert } from 'natmri/base/common/types'

export function mark(name: string) {
  performance.mark(name)
}

export function getMarks() {
  const timeOrigin = performance.timeOrigin

  const result = [{ name: 'code/timeOrigin', startTime: Math.round(timeOrigin) }]
  for (const entry of performance.getEntriesByType('mark')) {
    result.push({
      name: entry.name,
      startTime: Math.round(timeOrigin + entry.startTime),
    })
  }
  return result
}

export function getMarkTimeinterval(mark1: string, mark2?: string) {
  const timeOrigin = performance.timeOrigin

  if (!mark2)
    mark2 = mark1

  const marks = performance.getEntriesByType('mark')
    .filter(mark => mark.name === mark1 || mark.name === mark2)
    .map(mark => mark.startTime + timeOrigin)

  assert(marks.length === 2, new Error('get mark time interval, marks must be 2.'))

  return `${marks[1] - marks[0]}ms`
}
