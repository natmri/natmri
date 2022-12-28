export function randomUUID(): string {
  if (typeof require !== 'undefined')
    return window.require('node:crypto').webcrypto.randomUUID()

  return crypto.randomUUID()
}
