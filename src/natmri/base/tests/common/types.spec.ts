import { expect, suite, test } from 'vitest'
import { isFunction, isObject } from 'natmri/base/common/types'

suite('Type', () => {
  test('isObject', () => {
    expect(isObject(undefined)).toBeFalsy()
    expect(isObject(null)).toBeFalsy()
    expect(isObject('foo')).toBeFalsy()
    expect(isObject(5)).toBeFalsy()
    expect(isObject(true)).toBeFalsy()
    expect(isObject([])).toBeFalsy()
    expect(isObject([1, 2, '3'])).toBeFalsy()
    expect(isObject(/test/)).toBeFalsy()
    // eslint-disable-next-line prefer-regex-literals
    expect(isObject(new RegExp(''))).toBeFalsy()
    expect(isFunction(new Date())).toBeFalsy()
    expect(isObject(() => { })).toBeFalsy()

    expect(isObject({})).toBeTruthy()
    expect(isObject({ foo: 'bar' })).toBeTruthy()
  })
})
