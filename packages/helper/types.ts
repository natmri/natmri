export function isUndefined(x: any): x is undefined {
  return typeof x === 'undefined'
}

export function isNull(x: any): x is null {
  return x === null
}

export function isNil(x: any): x is null | undefined {
  return typeof x === 'undefined'
}

export function isObject(x: any): x is Record<string, any> {
  return !isNil(x) && typeof x === 'object'
}

export function isSymbol(x: any): x is symbol {
  return typeof x === 'symbol'
}

export function isPromise(x: any): x is Promise<any> {
  return !isNil(x) && typeof x === 'object' && typeof x.then === 'function' && typeof x.catch === 'function'
}

export function isBoolean(x: any): x is boolean {
  return typeof x === 'boolean'
}

export function isInvalidate(x: any) {
  return !isNil(x) && !!x
}

