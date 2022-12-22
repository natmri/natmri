import type { IDisposable } from 'natmri/base/common/lifecycle'
import { Disposable, DisposableStore, SafeDisposable, combinedDisposable } from 'natmri/base/common/lifecycle'
import { LinkedList } from 'natmri/base/common/linkedList'

export interface Event<T> {
  (listener: (e: T) => any, thisArgs?: any, disposables?: IDisposable[] | DisposableStore): IDisposable
}

export namespace Event {
  export const None: Event<any> = () => Disposable.None

  /**
   * Given an event, returns another event which debounces calls and defers the listeners to a later task via a shared
   * `setTimeout`. The event is converted into a signal (`Event<void>`) to avoid additional object creation as a
   * result of merging events and to try prevent race conditions that could arise when using related deferred and
   * non-deferred events.
   *
   * This is useful for deferring non-critical work (eg. general UI updates) to ensure it does not block critical work
   * (eg. latency of keypress to text rendered).
   *
   * *NOTE* that this function returns an `Event` and it MUST be called with a `DisposableStore` whenever the returned
   * event is accessible to "third parties", e.g the event is a public property. Otherwise a leaked listener on the
   * returned event causes this utility to leak a listener on the original event.
   *
   * @param event The event source for the new event.
   * @param disposable A disposable store to add the new EventEmitter to.
   */
  export function defer(event: Event<unknown>, disposable?: DisposableStore): Event<void> {
    return debounce<unknown, void>(event, () => undefined, undefined, undefined, disposable)
  }

  /**
   * Given an event, returns another event which only fires once.
   *
   * @param event The event source for the new event.
   */
  export function once<T>(event: Event<T>): Event<T> {
    return (listener, thisArgs = null, disposables?) => {
      // we need this, in case the event fires during the listener call
      let didFire = false
      const result: IDisposable = event((e) => {
        if (didFire)
          return

        else if (result)
          result.dispose()

        else
          didFire = true

        return listener.call(thisArgs, e)
      }, null, disposables)

      if (didFire)
        result.dispose()

      return result
    }
  }

  /**
   * Maps an event of one type into an event of another type using a mapping function, similar to how
   * `Array.prototype.map` works.
   *
   * *NOTE* that this function returns an `Event` and it MUST be called with a `DisposableStore` whenever the returned
   * event is accessible to "third parties", e.g the event is a public property. Otherwise a leaked listener on the
   * returned event causes this utility to leak a listener on the original event.
   *
   * @param event The event source for the new event.
   * @param map The mapping function.
   * @param disposable A disposable store to add the new EventEmitter to.
   */
  export function map<I, O>(event: Event<I>, map: (i: I) => O, disposable?: DisposableStore): Event<O> {
    return snapshot((listener, thisArgs = null, disposables?) => event(i => listener.call(thisArgs, map(i)), null, disposables), disposable)
  }

  /**
   * *NOTE* that this function returns an `Event` and it MUST be called with a `DisposableStore` whenever the returned
   * event is accessible to "third parties", e.g the event is a public property. Otherwise a leaked listener on the
   * returned event causes this utility to leak a listener on the original event.
   */
  export function forEach<I>(event: Event<I>, each: (i: I) => void, disposable?: DisposableStore): Event<I> {
    return snapshot((listener, thisArgs = null, disposables?) => event((i) => {
      each(i)
      listener.call(thisArgs, i)
    }, null, disposables), disposable)
  }

  /**
   * *NOTE* that this function returns an `Event` and it MUST be called with a `DisposableStore` whenever the returned
   * event is accessible to "third parties", e.g the event is a public property. Otherwise a leaked listener on the
   * returned event causes this utility to leak a listener on the original event.
   */
  export function filter<T, U>(event: Event<T | U>, filter: (e: T | U) => e is T, disposable?: DisposableStore): Event<T>
  export function filter<T>(event: Event<T>, filter: (e: T) => boolean, disposable?: DisposableStore): Event<T>
  export function filter<T, R>(event: Event<T | R>, filter: (e: T | R) => e is R, disposable?: DisposableStore): Event<R>
  export function filter<T>(event: Event<T>, filter: (e: T) => boolean, disposable?: DisposableStore): Event<T> {
    return snapshot((listener, thisArgs = null, disposables?) => event(e => filter(e) && listener.call(thisArgs, e), null, disposables), disposable)
  }

  /**
   * Given an event, returns the same event but typed as `Event<void>`.
   */
  export function signal<T>(event: Event<T>): Event<void> {
    return event as Event<any> as Event<void>
  }

  /**
   * Given a collection of events, returns a single event which emits
   * whenever any of the provided events emit.
   */
  export function any<T>(...events: Event<T>[]): Event<T>
  export function any(...events: Event<any>[]): Event<void>
  export function any<T>(...events: Event<T>[]): Event<T> {
    return (listener, thisArgs = null, disposables?) => combinedDisposable(...events.map(event => event(e => listener.call(thisArgs, e), null, disposables)))
  }

  /**
   * *NOTE* that this function returns an `Event` and it MUST be called with a `DisposableStore` whenever the returned
   * event is accessible to "third parties", e.g the event is a public property. Otherwise a leaked listener on the
   * returned event causes this utility to leak a listener on the original event.
   */
  export function reduce<I, O>(event: Event<I>, merge: (last: O | undefined, event: I) => O, initial?: O, disposable?: DisposableStore): Event<O> {
    let output: O | undefined = initial

    return map<I, O>(event, (e) => {
      output = merge(output, e)
      return output
    }, disposable)
  }

  function snapshot<T>(event: Event<T>, disposable: DisposableStore | undefined): Event<T> {
    let listener: IDisposable | undefined

    const options: EmitterOptions | undefined = {
      onWillAddFirstListener() {
        listener = event(emitter.fire, emitter)
      },
      onDidRemoveLastListener() {
        listener?.dispose()
      },
    }

    const emitter = new Emitter<T>(options)

    disposable?.add(emitter)

    return emitter.event
  }

  /**
   * *NOTE* that this function returns an `Event` and it MUST be called with a `DisposableStore` whenever the returned
   * event is accessible to "third parties", e.g the event is a public property. Otherwise a leaked listener on the
   * returned event causes this utility to leak a listener on the original event.
   */
  export function debounce<T>(event: Event<T>, merge: (last: T | undefined, event: T) => T, delay?: number, leading?: boolean, disposable?: DisposableStore): Event<T>
  /**
   * *NOTE* that this function returns an `Event` and it MUST be called with a `DisposableStore` whenever the returned
   * event is accessible to "third parties", e.g the event is a public property. Otherwise a leaked listener on the
   * returned event causes this utility to leak a listener on the original event.
   */
  export function debounce<I, O>(event: Event<I>, merge: (last: O | undefined, event: I) => O, delay?: number, leading?: boolean, disposable?: DisposableStore): Event<O>
  export function debounce<I, O>(event: Event<I>, merge: (last: O | undefined, event: I) => O, delay = 100, leading = false, disposable?: DisposableStore): Event<O> {
    let subscription: IDisposable
    let output: O | undefined
    let handle: any
    let numDebouncedCalls = 0

    const options: EmitterOptions | undefined = {
      onWillAddFirstListener() {
        subscription = event((cur) => {
          numDebouncedCalls++
          output = merge(output, cur)

          if (leading && !handle) {
            emitter.fire(output)
            output = undefined
          }

          clearTimeout(handle)
          handle = setTimeout(() => {
            const _output = output
            output = undefined
            handle = undefined
            if (!leading || numDebouncedCalls > 1)
              emitter.fire(_output!)

            numDebouncedCalls = 0
          }, delay)
        })
      },
      onDidRemoveLastListener() {
        subscription.dispose()
      },
    }

    const emitter = new Emitter<O>(options)

    disposable?.add(emitter)

    return emitter.event
  }

  /**
   * Debounces an event, firing after some delay (default=0) with an array of all event original objects.
   *
   * *NOTE* that this function returns an `Event` and it MUST be called with a `DisposableStore` whenever the returned
   * event is accessible to "third parties", e.g the event is a public property. Otherwise a leaked listener on the
   * returned event causes this utility to leak a listener on the original event.
   */
  export function accumulate<T>(event: Event<T>, delay = 0, disposable?: DisposableStore): Event<T[]> {
    return Event.debounce<T, T[]>(event, (last, e) => {
      if (!last)
        return [e]

      last.push(e)
      return last
    }, delay, undefined, disposable)
  }

  /**
   * *NOTE* that this function returns an `Event` and it MUST be called with a `DisposableStore` whenever the returned
   * event is accessible to "third parties", e.g the event is a public property. Otherwise a leaked listener on the
   * returned event causes this utility to leak a listener on the original event.
   */
  export function latch<T>(event: Event<T>, equals: (a: T, b: T) => boolean = (a, b) => a === b, disposable?: DisposableStore): Event<T> {
    let firstCall = true
    let cache: T

    return filter(event, (value) => {
      const shouldEmit = firstCall || !equals(value, cache)
      firstCall = false
      cache = value
      return shouldEmit
    }, disposable)
  }

  /**
   * Splits an event whose parameter is a union type into 2 separate events for each type in the union.
   *
   * *NOTE* that this function returns an `Event` and it MUST be called with a `DisposableStore` whenever the returned
   * event is accessible to "third parties", e.g the event is a public property. Otherwise a leaked listener on the
   * returned event causes this utility to leak a listener on the original event.
   *
   * @example
   * ```
   * const event = new EventEmitter<number | undefined>().event;
   * const [numberEvent, undefinedEvent] = Event.split(event, isUndefined);
   * ```
   *
   * @param event The event source for the new event.
   * @param isT A function that determines what event is of the first type.
   * @param disposable A disposable store to add the new EventEmitter to.
   */
  export function split<T, U>(event: Event<T | U>, isT: (e: T | U) => e is T, disposable?: DisposableStore): [Event<T>, Event<U>] {
    return [
      Event.filter(event, isT, disposable),
      Event.filter(event, e => !isT(e), disposable) as Event<U>,
    ]
  }

  /**
   * *NOTE* that this function returns an `Event` and it MUST be called with a `DisposableStore` whenever the returned
   * event is accessible to "third parties", e.g the event is a public property. Otherwise a leaked listener on the
   * returned event causes this utility to leak a listener on the original event.
   */
  export function buffer<T>(event: Event<T>, flushAfterTimeout = false, _buffer: T[] = []): Event<T> {
    let buffer: T[] | null = _buffer.slice()

    let listener: IDisposable | null = event((e) => {
      if (buffer)
        buffer.push(e)

      else
        emitter.fire(e)
    })

    const flush = () => {
      buffer?.forEach(e => emitter.fire(e))
      buffer = null
    }

    const emitter = new Emitter<T>({
      onWillAddFirstListener() {
        if (!listener)
          listener = event(e => emitter.fire(e))
      },

      onDidAddFirstListener() {
        if (buffer) {
          if (flushAfterTimeout)
            setTimeout(flush)

          else
            flush()
        }
      },

      onDidRemoveLastListener() {
        if (listener)
          listener.dispose()

        listener = null
      },
    })

    return emitter.event
  }

  export interface IChainableEvent<T> extends IDisposable {
    event: Event<T>
    map<O>(fn: (i: T) => O): IChainableEvent<O>
    forEach(fn: (i: T) => void): IChainableEvent<T>
    filter(fn: (e: T) => boolean): IChainableEvent<T>
    filter<R>(fn: (e: T | R) => e is R): IChainableEvent<R>
    reduce<R>(merge: (last: R | undefined, event: T) => R, initial?: R): IChainableEvent<R>
    latch(): IChainableEvent<T>
    debounce(merge: (last: T | undefined, event: T) => T, delay?: number, leading?: boolean): IChainableEvent<T>
    debounce<R>(merge: (last: R | undefined, event: T) => R, delay?: number, leading?: boolean): IChainableEvent<R>
    on(listener: (e: T) => any, thisArgs?: any, disposables?: IDisposable[] | DisposableStore): IDisposable
    once(listener: (e: T) => any, thisArgs?: any, disposables?: IDisposable[]): IDisposable
  }

  class ChainableEvent<T> implements IChainableEvent<T> {
    private readonly disposables = new DisposableStore()

    constructor(readonly event: Event<T>) { }

    map<O>(fn: (i: T) => O): IChainableEvent<O> {
      return new ChainableEvent(map(this.event, fn, this.disposables))
    }

    forEach(fn: (i: T) => void): IChainableEvent<T> {
      return new ChainableEvent(forEach(this.event, fn, this.disposables))
    }

    filter(fn: (e: T) => boolean): IChainableEvent<T>
    filter<R>(fn: (e: T | R) => e is R): IChainableEvent<R>
    filter(fn: (e: T) => boolean): IChainableEvent<T> {
      return new ChainableEvent(filter(this.event, fn, this.disposables))
    }

    reduce<R>(merge: (last: R | undefined, event: T) => R, initial?: R): IChainableEvent<R> {
      return new ChainableEvent(reduce(this.event, merge, initial, this.disposables))
    }

    latch(): IChainableEvent<T> {
      return new ChainableEvent(latch(this.event, undefined, this.disposables))
    }

    debounce(merge: (last: T | undefined, event: T) => T, delay?: number, leading?: boolean): IChainableEvent<T>
    debounce<R>(merge: (last: R | undefined, event: T) => R, delay?: number, leading?: boolean): IChainableEvent<R>
    debounce<R>(merge: (last: R | undefined, event: T) => R, delay = 100, leading = false): IChainableEvent<R> {
      return new ChainableEvent(debounce(this.event, merge, delay, leading, this.disposables))
    }

    on(listener: (e: T) => any, thisArgs: any, disposables: IDisposable[] | DisposableStore) {
      return this.event(listener, thisArgs, disposables)
    }

    once(listener: (e: T) => any, thisArgs: any, disposables: IDisposable[]) {
      return once(this.event)(listener, thisArgs, disposables)
    }

    dispose() {
      this.disposables.dispose()
    }
  }

  export function chain<T>(event: Event<T>): IChainableEvent<T> {
    return new ChainableEvent(event)
  }

  export interface NodeEventEmitter {
    on(event: string | symbol, listener: Function): unknown
    removeListener(event: string | symbol, listener: Function): unknown
  }

  export function fromNodeEventEmitter<T>(emitter: NodeEventEmitter, eventName: string, map: (...args: any[]) => T = id => id): Event<T> {
    const fn = (...args: any[]) => result.fire(map(...args))
    const onFirstListenerAdd = () => emitter.on(eventName, fn)
    const onLastListenerRemove = () => emitter.removeListener(eventName, fn)
    const result = new Emitter<T>({ onWillAddFirstListener: onFirstListenerAdd, onDidRemoveLastListener: onLastListenerRemove })

    return result.event
  }

  export interface DOMEventEmitter {
    addEventListener(event: string | symbol, listener: Function): void
    removeEventListener(event: string | symbol, listener: Function): void
  }

  export function fromDOMEventEmitter<T>(emitter: DOMEventEmitter, eventName: string, map: (...args: any[]) => T = id => id): Event<T> {
    const fn = (...args: any[]) => result.fire(map(...args))
    const onFirstListenerAdd = () => emitter.addEventListener(eventName, fn)
    const onLastListenerRemove = () => emitter.removeEventListener(eventName, fn)
    const result = new Emitter<T>({ onWillAddFirstListener: onFirstListenerAdd, onDidRemoveLastListener: onLastListenerRemove })

    return result.event
  }

  export function toPromise<T>(event: Event<T>): Promise<T> {
    return new Promise(resolve => once(event)(resolve))
  }
}

class EventDeliveryQueueElement<T = any> {
  constructor(
    readonly emitter: Emitter<T>,
    readonly listener: Listener<T>,
    readonly event: T,
  ) { }
}

export class EventDeliveryQueue {
  protected _queue = new LinkedList<EventDeliveryQueueElement>()

  get size(): number {
    return this._queue.size
  }

  push<T>(emitter: Emitter<T>, listener: Listener<T>, event: T): void {
    this._queue.push(new EventDeliveryQueueElement(emitter, listener, event))
  }

  clear<T>(emitter: Emitter<T>): void {
    const newQueue = new LinkedList<EventDeliveryQueueElement>()
    for (const element of this._queue) {
      if (element.emitter !== emitter)
        newQueue.push(element)
    }
    this._queue = newQueue
  }

  deliver(): void {
    while (this._queue.size > 0) {
      const element = this._queue.shift()!
      try {
        element.listener.invoke(element.event)
      }
      catch (e) {
        // onUnexpectedError(e)
      }
    }
  }
}

class PrivateEventDeliveryQueue extends EventDeliveryQueue {
  override clear<T>(_: Emitter<T>): void {
    // Here we can just clear the entire linked list because
    // all elements are guaranteed to belong to this emitter
    this._queue.clear()
  }
}

export interface EmitterOptions {
  /**
   * Optional function that's called *before* the very first listener is added
   */
  onWillAddFirstListener?: Function
  /**
   * Optional function that's called *after* the very first listener is added
   */
  onDidAddFirstListener?: Function
  /**
   * Optional function that's called after a listener is added
   */
  onDidAddListener?: Function
  /**
   * Optional function that's called *after* remove the very last listener
   */
  onDidRemoveLastListener?: Function
  /**
   * Pass in a delivery queue, which is useful for ensuring
   * in order event delivery across multiple emitters.
   */
  deliveryQueue?: EventDeliveryQueue
}

class Listener<T> {
  readonly subscription = new SafeDisposable()

  constructor(
    readonly callback: (e: T) => void,
    readonly callbackThis: any | undefined,
  ) { }

  invoke(e: T) {
    this.callback.call(this.callbackThis, e)
  }
}

export class Emitter<T> {
  private readonly _options?: EmitterOptions
  private _disposed = false
  private _event?: Event<T>
  private _deliveryQueue?: EventDeliveryQueue
  protected _listeners?: LinkedList<Listener<T>>

  constructor(options?: EmitterOptions) {
    this._options = options
    this._deliveryQueue = this._options?.deliveryQueue
  }

  dispose() {
    if (!this._disposed) {
      this._disposed = true

      // It is bad to have listeners at the time of disposing an emitter, it is worst to have listeners keep the emitter
      // alive via the reference that's embedded in their disposables. Therefore we loop over all remaining listeners and
      // unset their subscriptions/disposables. Looping and blaming remaining listeners is done on next tick because the
      // the following programming pattern is very popular:
      //
      // const someModel = this._disposables.add(new ModelObject()); // (1) create and register model
      // this._disposables.add(someModel.onDidChange(() => { ... }); // (2) subscribe and register model-event listener
      // ...later...
      // this._disposables.dispose(); disposes (1) then (2): don't warn after (1) but after the "overall dispose" is done

      if (this._listeners) {
        const listeners = Array.from(this._listeners)
        queueMicrotask(() => {
          for (const listener of listeners) {
            if (listener.subscription.isset())
              listener.subscription.unset()
          }
        })

        this._listeners.clear()
      }
      this._deliveryQueue?.clear(this)
      this._options?.onDidRemoveLastListener?.()
    }
  }

  /**
   * For the public to allow to subscribe
   * to events from this Emitter
   */
  get event(): Event<T> {
    if (!this._event) {
      this._event = (callback: (e: T) => any, thisArgs?: any, disposables?: IDisposable[] | DisposableStore) => {
        if (!this._listeners)
          this._listeners = new LinkedList()

        const firstListener = this._listeners.isEmpty()

        if (firstListener && this._options?.onWillAddFirstListener)
          this._options.onWillAddFirstListener(this)

        let removeMonitor: Function | undefined

        const listener = new Listener(callback, thisArgs)
        const removeListener = this._listeners.push(listener)

        if (firstListener && this._options?.onDidAddFirstListener)
          this._options.onDidAddFirstListener(this)

        if (this._options?.onDidAddListener)
          this._options.onDidAddListener(this, callback, thisArgs)

        const result = listener.subscription.set(() => {
          removeMonitor?.()
          if (!this._disposed) {
            removeListener()
            if (this._options && this._options.onDidRemoveLastListener) {
              const hasListeners = (this._listeners && !this._listeners.isEmpty())
              if (!hasListeners)
                this._options.onDidRemoveLastListener(this)
            }
          }
        })

        if (disposables instanceof DisposableStore)
          disposables.add(result)

        else if (Array.isArray(disposables))
          disposables.push(result)

        return result
      }
    }
    return this._event
  }

  /**
   * To be kept private to fire an event to
   * subscribers
   */
  fire(event: T): void {
    if (this._listeners) {
      // put all [listener,event]-pairs into delivery queue
      // then emit all event. an inner/nested event might be
      // the driver of this

      if (!this._deliveryQueue)
        this._deliveryQueue = new PrivateEventDeliveryQueue()

      for (const listener of this._listeners)
        this._deliveryQueue.push(this, listener, event)

      this._deliveryQueue.deliver()
    }
  }

  hasListeners(): boolean {
    if (!this._listeners)
      return false

    return !this._listeners.isEmpty()
  }
}
