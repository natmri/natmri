export function assert(value: unknown, message?: string | Error) {
  if (!isUndefinedOrNull(value) && !value)
    console.error(message)
}

export function isUndefined(obj: unknown): obj is undefined {
  return typeof obj === 'undefined'
}

export function isUndefinedOrNull(obj: unknown): obj is undefined | null {
  return isUndefined(obj) || obj === null
}

export function isFunction(obj: unknown): obj is Function {
  return typeof obj === 'function'
}

export function isDefined<T>(arg: T | undefined | null): arg is T {
  return !isUndefinedOrNull(arg)
}

export function assertType(condition: unknown, type?: string): asserts condition {
  if (!condition)
    throw new Error(type ? `Unexpected type, expected '${type}'` : 'Unexpected type')
}

/**
 * Converts null to undefined, passes all other values through.
 */
export function withNullAsUndefined<T>(x: T | null): T | undefined {
  return x === null ? undefined : x
}

/**
 * Converts undefined to null, passes all other values through.
 */
export function withUndefinedAsNull<T>(x: T | undefined): T | null {
  return typeof x === 'undefined' ? null : x
}

export function isArray(obj: unknown): obj is unknown[] {
  return Array.isArray(obj)
}

/**
 * @returns whether the provided parameter is of type `object` but **not**
 *  `null`, an `array`, a `regexp`, nor a `date`.
 */
export function isObject(obj: unknown): obj is Object {
  // The method can't do a type cast since there are type (like strings) which
  // are subclasses of any put not positvely matched by the function. Hence type
  // narrowing results in wrong results.
  return typeof obj === 'object'
    && obj !== null
    && !Array.isArray(obj)
    && !(obj instanceof RegExp)
    && !(obj instanceof Date)
}
