import { isWeb } from 'natmri/base/common/environment'

export function randomUUID(): string {
  if (typeof window !== 'undefined' && typeof require === 'function')
    return window.crypto.randomUUID()

  if (typeof require !== 'undefined' || !isWeb)
    return require('node:crypto').webcrypto.randomUUID()

  return crypto.randomUUID()
}
