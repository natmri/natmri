import { once } from 'natmri/base/common/functional'

/**
 * An object that performs a cleanup operation when `.dispose()` is called.
 *
 * Some examples of how disposables are used:
 *
 * - An event listener that removes itself when `.dispose()` is called.
 * - A resource such as a file system watcher that cleans up the resource when `.dispose()` is called.
 * - The return value from registering a provider. When `.dispose()` is called, the provider is unregistered.
 */
export interface IDisposable {
  dispose(): void
}

/**
 * Check if `thing` is {@link IDisposable disposable}.
 */
export function isDisposable<E extends object>(thing: E): thing is E & IDisposable {
  return typeof (<IDisposable>thing).dispose === 'function' && (<IDisposable>thing).dispose.length === 0
}

export class DisposableStore implements IDisposable {
  private readonly _toDispose = new Set<IDisposable>()

  private _isDisposed = false

  get isDisposed() { return this._isDisposed }

  /**
   * Add a new {@link IDisposable disposable} to the collection.
   */
  add<T extends IDisposable>(disposable: T) {
    if ((disposable as any as DisposableStore) === this)
      throw new Error('[CycleReferenceError] Cannot register a disposable on itself!')

    if (this.isDisposed)
      console.warn(new Error('Trying to add a disposable to a DisposableStore that has already been disposed of. The added object will be leaked!').stack)

    this._toDispose.add(disposable)

    return disposable
  }

  clear() {
    try {
      for (const disposable of this._toDispose)
        disposable.dispose()
    }
    finally {
      this._toDispose.clear()
    }
  }

  dispose(): void {
    if (this._isDisposed)
      return

    this.clear()
    this._isDisposed = true
  }
}

export abstract class Disposable implements IDisposable {
  static readonly None: IDisposable = Object.freeze({ dispose() {} })
  private readonly _store = new DisposableStore()

  protected _register<T extends IDisposable>(disposable: T): T {
    if ((disposable as any as Disposable) === this)
      throw new Error('[CycleReferenceError] Cannot register a disposable on itself!')

    return this._store.add(disposable)
  }

  dispose(): void {
    this._store.dispose()
  }
}

export class SafeDisposable implements IDisposable {
  dispose: () => void = () => { }
  unset: () => void = () => { }
  isset: () => boolean = () => false

  constructor() {
  }

  set(fn: Function) {
    let callback: Function | undefined = fn
    this.unset = () => callback = undefined
    this.isset = () => callback !== undefined
    this.dispose = () => {
      if (callback) {
        callback()
        callback = undefined
      }
    }
    return this
  }
}

export function combinedDisposable(...disposables: IDisposable[]): IDisposable {
  return {
    dispose() {
      disposables.forEach(disposable => disposable.dispose())
    },
  }
}

/**
 * Turn a function that implements dispose into an {@link IDisposable}.
 */
export function toDisposable(fn: () => void): IDisposable {
  const self = {
    dispose: once(() => {
      fn()
    }),
  }
  return self
}
