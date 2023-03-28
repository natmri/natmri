import { isObject } from 'natmri/base/common/types'

export function stringify(value: any) {
  const seen = new Set<any>()

  return JSON.stringify(value, (key, value) => {
    if (isObject(value) || Array.isArray(value)) {
      if (seen.has(value))
        return '[Circular]'

      seen.add(value)
      return value
    }
  })
}
