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

export interface ErrorListenerCallback {
  (error: any): void
}

export interface ErrorListenerUnbind {
  (): void
}

// Avoid circular dependency on EventEmitter by implementing a subset of the interface.
export class ErrorHandler {
  private unexpectedErrorHandler: (e: any) => void
  private listeners: ErrorListenerCallback[]

  constructor() {
    this.listeners = []

    this.unexpectedErrorHandler = function (e: any) {
      setTimeout(() => {
        if (e.stack)
          throw new Error(`${e.message}\n\n${e.stack}`)

        throw e
      }, 0)
    }
  }

  addListener(listener: ErrorListenerCallback): ErrorListenerUnbind {
    this.listeners.push(listener)

    return () => {
      this._removeListener(listener)
    }
  }

  private emit(e: any): void {
    this.listeners.forEach((listener) => {
      listener(e)
    })
  }

  private _removeListener(listener: ErrorListenerCallback): void {
    this.listeners.splice(this.listeners.indexOf(listener), 1)
  }

  setUnexpectedErrorHandler(newUnexpectedErrorHandler: (e: any) => void): void {
    this.unexpectedErrorHandler = newUnexpectedErrorHandler
  }

  getUnexpectedErrorHandler(): (e: any) => void {
    return this.unexpectedErrorHandler
  }

  onUnexpectedError(e: any): void {
    this.unexpectedErrorHandler(e)
    this.emit(e)
  }

  // For external errors, we don't want the listeners to be called
  onUnexpectedExternalError(e: any): void {
    this.unexpectedErrorHandler(e)
  }
}

export const errorHandler = new ErrorHandler()

export function setUnexpectedErrorHandler(newUnexpectedErrorHandler: (e: any) => void): void {
  errorHandler.setUnexpectedErrorHandler(newUnexpectedErrorHandler)
}

export function onUnexpectedError(e: any): undefined {
  // ignore errors from cancelled promises
  if (!isCancellationError(e))
    errorHandler.onUnexpectedError(e)

  return undefined
}
