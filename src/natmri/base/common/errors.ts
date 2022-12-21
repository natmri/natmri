export function toErrorMessage(message: Error, verbose = false): string {
  if (message instanceof Error) {
    if (verbose)
      return `${message.message}\n${message.stack}`

    else
      return `${message.message}`
  }
  else {
    return message
  }
}

const canceledName = 'Canceled'

/**
 * Checks if the given error is a promise in canceled state
 */
export function isCancellationError(error: any): boolean {
  if (error instanceof CancellationError)
    return true

  return error instanceof Error && error.name === canceledName && error.message === canceledName
}

// !!!IMPORTANT!!!
// Do NOT change this class because it is also used as an API-type.
export class CancellationError extends Error {
  constructor() {
    super(canceledName)
    this.name = this.message
  }
}

export function illegalState(name?: string): Error {
  if (name)
    return new Error(`Illegal state: ${name}`)
  else
    return new Error('Illegal state')
}
