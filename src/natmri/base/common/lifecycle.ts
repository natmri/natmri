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

function isIterable<T = any>(thing: any): thing is Iterable<T> {
  return thing && typeof thing === 'object' && typeof thing[Symbol.iterator] === 'function'
}

/**
 * Disposes of the value(s) passed in.
 */
export function dispose<T extends IDisposable>(disposable: T): T
export function dispose<T extends IDisposable>(disposable: T | undefined): T | undefined
export function dispose<T extends IDisposable, A extends Iterable<T> = Iterable<T>>(disposables: A): A
export function dispose<T extends IDisposable>(disposables: Array<T>): Array<T>
export function dispose<T extends IDisposable>(disposables: ReadonlyArray<T>): ReadonlyArray<T>
export function dispose<T extends IDisposable>(arg: T | Iterable<T> | undefined): any {
  if (isIterable(arg)) {
    const errors: any[] = []

    for (const d of arg) {
      if (d) {
        try {
          d.dispose()
        }
        catch (e) {
          errors.push(e)
        }
      }
    }

    if (errors.length === 1)
      throw errors[0]

    else if (errors.length > 1)
      throw new AggregateError(errors, 'Encountered errors while disposing of store')

    return Array.isArray(arg) ? [] : arg
  }
  else if (arg) {
    arg.dispose()
    return arg
  }
}

/**
 * Manages the lifecycle of a disposable value that may be changed.
 *
 * This ensures that when the disposable value is changed, the previously held disposable is disposed of. You can
 * also register a `MutableDisposable` on a `Disposable` to ensure it is automatically cleaned up.
 */
export class MutableDisposable<T extends IDisposable> implements IDisposable {
  private _value?: T
  private _isDisposed = false

  constructor() {
  }

  get value(): T | undefined {
    return this._isDisposed ? undefined : this._value
  }

  set value(value: T | undefined) {
    if (this._isDisposed || value === this._value)
      return

    this._value?.dispose()

    this._value = value
  }

  /**
   * Resets the stored value and disposed of the previously stored value.
   */
  clear(): void {
    this.value = undefined
  }

  dispose(): void {
    this._isDisposed = true
    this._value?.dispose()
    this._value = undefined
  }

  /**
   * Clears the value, but does not dispose it.
   * The old value is returned.
   */
  clearAndLeak(): T | undefined {
    const oldValue = this._value
    this._value = undefined

    return oldValue
  }
}

/**
 * A map the manages the lifecycle of the values that it stores.
 */
export class DisposableMap<K, V extends IDisposable = IDisposable> implements IDisposable {
  private readonly _store = new Map<K, V>()
  private _isDisposed = false

  /**
   * Disposes of all stored values and mark this object as disposed.
   *
   * Trying to use this object after it has been disposed of is an error.
   */
  dispose(): void {
    this._isDisposed = true
    this.clearAndDisposeAll()
  }

  /**
   * Disposes of all stored values and clear the map, but DO NOT mark this object as disposed.
   */
  clearAndDisposeAll(): void {
    if (!this._store.size)
      return

    try {
      dispose(this._store.values())
    }
    finally {
      this._store.clear()
    }
  }

  has(key: K): boolean {
    return this._store.has(key)
  }

  get size(): number {
    return this._store.size
  }

  get(key: K): V | undefined {
    return this._store.get(key)
  }

  set(key: K, value: V, skipDisposeOnOverwrite = false): void {
    if (this._isDisposed)
      console.warn(new Error('Trying to add a disposable to a DisposableMap that has already been disposed of. The added object will be leaked!').stack)

    if (!skipDisposeOnOverwrite)
      this._store.get(key)?.dispose()

    this._store.set(key, value)
  }

  /**
   * Delete the value stored for `key` from this map and also dispose of it.
   */
  deleteAndDispose(key: K): void {
    this._store.get(key)?.dispose()
    this._store.delete(key)
  }

  keys(): IterableIterator<K> {
    return this._store.keys()
  }

  values(): IterableIterator<V> {
    return this._store.values()
  }

  [Symbol.iterator](): IterableIterator<[K, V]> {
    return this._store[Symbol.iterator]()
  }
}
