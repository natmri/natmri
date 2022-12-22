/* ---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *-------------------------------------------------------------------------------------------- */

export function once<T extends Function>(this: unknown, fn: T): T {
  // eslint-disable-next-line @typescript-eslint/no-this-alias
  const _this = this
  let didCall = false
  let result: unknown

  return function () {
    if (didCall)
      return result

    didCall = true
    // eslint-disable-next-line prefer-rest-params
    result = fn.apply(_this, arguments)

    return result
  } as unknown as T
}