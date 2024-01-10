/* eslint-disable ts/no-use-before-define */
import type { CancellationToken } from 'natmri/base/common/cancellation'
import { CancellationTokenSource } from 'natmri/base/common/cancellation'
import { CancellationError } from 'natmri/base/common/errors'
import type { IDisposable } from 'natmri/base/common/lifecycle'

export function isThenable<T>(obj: unknown): obj is Promise<T> {
  return !!obj && typeof (obj as unknown as Promise<T>).then === 'function'
}

export interface CancelablePromise<T> extends Promise<T> {
  cancel(): void
}

export function createCancelablePromise<T>(callback: (token: CancellationToken) => Promise<T>): CancelablePromise<T> {
  const source = new CancellationTokenSource()

  const thenable = callback(source.token)
  const promise = new Promise<T>((resolve, reject) => {
    const subscription = source.token.onCancellationRequested(() => {
      subscription.dispose()
      source.dispose()
      reject(new CancellationError())
    })
    Promise.resolve(thenable).then((value) => {
      subscription.dispose()
      source.dispose()
      resolve(value)
    }, (err) => {
      subscription.dispose()
      source.dispose()
      reject(err)
    })
  })

  return <CancelablePromise<T>> new class {
    cancel() {
      source.cancel()
    }

    then<TResult1 = T, TResult2 = never>(resolve?: ((value: T) => TResult1 | Promise<TResult1>) | undefined | null, reject?: ((reason: any) => TResult2 | Promise<TResult2>) | undefined | null): Promise<TResult1 | TResult2> {
      return promise.then(resolve, reject)
    }

    catch<TResult = never>(reject?: ((reason: any) => TResult | Promise<TResult>) | undefined | null): Promise<T | TResult> {
      return this.then(undefined, reject)
    }

    finally(onfinally?: (() => void) | undefined | null): Promise<T> {
      return promise.finally(onfinally)
    }
  }()
}

export function timeout(millis: number): CancelablePromise<void>
export function timeout(millis: number, token: CancellationToken): Promise<void>
export function timeout(millis: number, token?: CancellationToken): CancelablePromise<void> | Promise<void> {
  if (!token)
    return createCancelablePromise(token => timeout(millis, token))

  return new Promise((resolve, reject) => {
    const handle = setTimeout(() => {
      disposable.dispose()
      resolve()
    }, millis)
    const disposable = token.onCancellationRequested(() => {
      clearTimeout(handle)
      disposable.dispose()
      reject(new CancellationError())
    })
  })
}

// #region -- run on idle tricks ------------

export interface IdleDeadline {
  readonly didTimeout: boolean
  timeRemaining(): number
}

/**
 * Execute the callback the next time the browser is idle, returning an
 * {@link IDisposable} that will cancel the callback when disposed. This wraps
 * [requestIdleCallback] so it will fallback to [setTimeout] if the environment
 * doesn't support it.
 *
 * @param callback The callback to run when idle, this includes an
 * [IdleDeadline] that provides the time alloted for the idle callback by the
 * browser. Not respecting this deadline will result in a degraded user
 * experience.
 * @param timeout A timeout at which point to queue no longer wait for an idle
 * callback but queue it on the regular event loop (like setTimeout). Typically
 * this should not be used.
 *
 * [IdleDeadline]: https://developer.mozilla.org/en-US/docs/Web/API/IdleDeadline
 * [requestIdleCallback]: https://developer.mozilla.org/en-US/docs/Web/API/Window/requestIdleCallback
 * [setTimeout]: https://developer.mozilla.org/en-US/docs/Web/API/Window/setTimeout
 */
export let runWhenIdle: (callback: (idle: IdleDeadline) => void, timeout?: number) => IDisposable

declare function requestIdleCallback(callback: (args: IdleDeadline) => void, options?: { timeout: number }): number
declare function cancelIdleCallback(handle: number): void;

(function () {
  if (typeof requestIdleCallback !== 'function' || typeof cancelIdleCallback !== 'function') {
    runWhenIdle = (runner) => {
      setTimeout(() => {
        if (disposed)
          return

        const end = Date.now() + 15 // one frame at 64fps
        runner(Object.freeze({
          didTimeout: true,
          timeRemaining() {
            return Math.max(0, end - Date.now())
          },
        }))
      })
      let disposed = false
      return {
        dispose() {
          if (disposed)
            return

          disposed = true
        },
      }
    }
  }
  else {
    runWhenIdle = (runner, timeout?) => {
      const handle: number = requestIdleCallback(runner, typeof timeout === 'number' ? { timeout } : undefined)
      let disposed = false
      return {
        dispose() {
          if (disposed)
            return

          disposed = true
          cancelIdleCallback(handle)
        },
      }
    }
  }
})()

/**
 * An implementation of the "idle-until-urgent"-strategy as introduced
 * here: https://philipwalton.com/articles/idle-until-urgent/
 */
export class IdleValue<T> {
  private readonly _executor: () => void
  private readonly _handle: IDisposable

  private _didRun = false
  private _value?: T
  private _error: unknown

  constructor(executor: () => T) {
    this._executor = () => {
      try {
        this._value = executor()
      }
      catch (err) {
        this._error = err
      }
      finally {
        this._didRun = true
      }
    }
    this._handle = runWhenIdle(() => this._executor())
  }

  dispose(): void {
    this._handle.dispose()
  }

  get value(): T {
    if (!this._didRun) {
      this._handle.dispose()
      this._executor()
    }
    if (this._error)
      throw this._error

    return this._value!
  }

  get isInitialized(): boolean {
    return this._didRun
  }
}

export const MicrotaskDelay = Symbol('MicrotaskDelay')

interface IScheduledLater extends IDisposable {
  isTriggered(): boolean
}

function timeoutDeferred(timeout: number, fn: () => void): IScheduledLater {
  let scheduled = true
  const handle = setTimeout(() => {
    scheduled = false
    fn()
  }, timeout)
  return {
    isTriggered: () => scheduled,
    dispose: () => {
      clearTimeout(handle)
      scheduled = false
    },
  }
}

function microtaskDeferred(fn: () => void): IScheduledLater {
  let scheduled = true
  queueMicrotask(() => {
    if (scheduled) {
      scheduled = false
      fn()
    }
  })

  return {
    isTriggered: () => scheduled,
    dispose: () => { scheduled = false },
  }
}

/**
 * A helper to delay (debounce) execution of a task that is being requested often.
 *
 * Following the throttler, now imagine the mail man wants to optimize the number of
 * trips proactively. The trip itself can be long, so he decides not to make the trip
 * as soon as a letter is submitted. Instead he waits a while, in case more
 * letters are submitted. After said waiting period, if no letters were submitted, he
 * decides to make the trip. Imagine that N more letters were submitted after the first
 * one, all within a short period of time between each other. Even though N+1
 * submissions occurred, only 1 delivery was made.
 *
 * The delayer offers this behavior via the trigger() method, into which both the task
 * to be executed and the waiting period (delay) must be passed in as arguments. Following
 * the example:
 *
 *    const delayer = new Delayer(WAITING_PERIOD);
 *    const letters = [];
 *
 *    function letterReceived(l) {
 *      letters.push(l);
 *      delayer.trigger(() => { return makeTheTrip(); });
 *    }
 */
export class Delayer<T> implements IDisposable {
  private deferred: IScheduledLater | null
  private completionPromise: Promise<any> | null
  private doResolve: ((value?: any | Promise<any>) => void) | null
  private doReject: ((err: any) => void) | null
  private task: ITask<T | Promise<T>> | null

  constructor(public defaultDelay: number | typeof MicrotaskDelay) {
    this.deferred = null
    this.completionPromise = null
    this.doResolve = null
    this.doReject = null
    this.task = null
  }

  trigger(task: ITask<T | Promise<T>>, delay = this.defaultDelay): Promise<T> {
    this.task = task
    this.cancelTimeout()

    if (!this.completionPromise) {
      this.completionPromise = new Promise((resolve, reject) => {
        this.doResolve = resolve
        this.doReject = reject
      }).then(() => {
        this.completionPromise = null
        this.doResolve = null
        if (this.task) {
          const task = this.task
          this.task = null
          return task()
        }
        return undefined
      })
    }

    const fn = () => {
      this.deferred = null
      this.doResolve?.(null)
    }

    this.deferred = delay === MicrotaskDelay ? microtaskDeferred(fn) : timeoutDeferred(delay, fn)

    return this.completionPromise
  }

  isTriggered(): boolean {
    return !!this.deferred?.isTriggered()
  }

  cancel(): void {
    this.cancelTimeout()

    if (this.completionPromise) {
      this.doReject?.(new CancellationError())
      this.completionPromise = null
    }
  }

  private cancelTimeout(): void {
    this.deferred?.dispose()
    this.deferred = null
  }

  dispose(): void {
    this.cancel()
  }
}

/**
 * A helper to delay execution of a task that is being requested often, while
 * preventing accumulation of consecutive executions, while the task runs.
 *
 * The mail man is clever and waits for a certain amount of time, before going
 * out to deliver letters. While the mail man is going out, more letters arrive
 * and can only be delivered once he is back. Once he is back the mail man will
 * do one more trip to deliver the letters that have accumulated while he was out.
 */
export class ThrottledDelayer<T> {
  private delayer: Delayer<Promise<T>>
  private throttler: Throttler

  constructor(defaultDelay: number) {
    this.delayer = new Delayer(defaultDelay)
    this.throttler = new Throttler()
  }

  trigger(promiseFactory: ITask<Promise<T>>, delay?: number): Promise<T> {
    return this.delayer.trigger(() => this.throttler.queue(promiseFactory), delay) as unknown as Promise<T>
  }

  isTriggered(): boolean {
    return this.delayer.isTriggered()
  }

  cancel(): void {
    this.delayer.cancel()
  }

  dispose(): void {
    this.delayer.dispose()
  }
}

// #endregion

/**
 * A barrier that is initially closed and then becomes opened permanently.
 */
export class Barrier {
  private _isOpen: boolean
  private _promise: Promise<boolean>
  private _completePromise!: (v: boolean) => void

  constructor() {
    this._isOpen = false
    this._promise = new Promise<boolean>((resolve, _reject) => {
      this._completePromise = resolve
    })
  }

  isOpen(): boolean {
    return this._isOpen
  }

  open(): void {
    this._isOpen = true
    this._completePromise(true)
  }

  wait(): Promise<boolean> {
    return this._promise
  }
}

export interface ITask<T> {
  (): T
}

/**
 * A helper to prevent accumulation of sequential async tasks.
 *
 * Imagine a mail man with the sole task of delivering letters. As soon as
 * a letter submitted for delivery, he drives to the destination, delivers it
 * and returns to his base. Imagine that during the trip, N more letters were submitted.
 * When the mail man returns, he picks those N letters and delivers them all in a
 * single trip. Even though N+1 submissions occurred, only 2 deliveries were made.
 *
 * The throttler implements this via the queue() method, by providing it a task
 * factory. Following the example:
 *
 * const throttler = new Throttler();
 * const letters = [];
 *
 * function deliver() {
 *  const lettersToDeliver = letters;
 *  letters = [];
 *  return makeTheTrip(lettersToDeliver);
 * }
 *
 * function onLetterReceived(l) {
 *  letters.push(l);
 *  throttler.queue(deliver);
 * }
 */
export class Throttler {
  private activePromise: Promise<any> | null
  private queuedPromise: Promise<any> | null
  private queuedPromiseFactory: ITask<Promise<any>> | null

  constructor() {
    this.activePromise = null
    this.queuedPromise = null
    this.queuedPromiseFactory = null
  }

  queue<T>(promiseFactory: ITask<Promise<T>>): Promise<T> {
    if (this.activePromise) {
      this.queuedPromiseFactory = promiseFactory

      if (!this.queuedPromise) {
        const onComplete = () => {
          this.queuedPromise = null

          const result = this.queue(this.queuedPromiseFactory!)
          this.queuedPromiseFactory = null

          return result
        }

        this.queuedPromise = new Promise((resolve) => {
          this.activePromise!.then(onComplete, onComplete).then(resolve)
        })
      }

      return new Promise((resolve, reject) => {
        this.queuedPromise!.then(resolve, reject)
      })
    }

    this.activePromise = promiseFactory()

    return new Promise((resolve, reject) => {
      this.activePromise!.then((result: T) => {
        this.activePromise = null
        resolve(result)
      }, (err: unknown) => {
        this.activePromise = null
        reject(err)
      })
    })
  }
}

export class Sequencer {
  private current: Promise<unknown> = Promise.resolve(null)

  queue<T>(promiseTask: ITask<Promise<T>>): Promise<T> {
    return this.current = this.current.then(() => promiseTask(), () => promiseTask())
  }
}

// #region

export type ValueCallback<T = unknown> = (value: T | Promise<T>) => void

/**
 * Creates a promise whose resolution or rejection can be controlled imperatively.
 */
export class DeferredPromise<T> {
  private completeCallback!: ValueCallback<T>
  private errorCallback!: (err: unknown) => void
  private rejected = false
  private resolved = false

  public get isRejected() {
    return this.rejected
  }

  public get isResolved() {
    return this.resolved
  }

  public get isSettled() {
    return this.rejected || this.resolved
  }

  public readonly p: Promise<T>

  constructor() {
    this.p = new Promise<T>((resolve, reject) => {
      this.completeCallback = resolve
      this.errorCallback = reject
    })
  }

  public complete(value: T) {
    return new Promise<void>((resolve) => {
      this.completeCallback(value)
      this.resolved = true
      resolve()
    })
  }

  public error(err: unknown) {
    return new Promise<void>((resolve) => {
      this.errorCallback(err)
      this.rejected = true
      resolve()
    })
  }

  public cancel() {
    new Promise<void>((resolve) => {
      this.errorCallback(new CancellationError())
      this.rejected = true
      resolve()
    })
  }
}

// #endregion

export class RunOnceScheduler implements IDisposable {
  protected runner: ((...args: unknown[]) => void) | null

  private timeoutToken: any
  private timeout: number
  private timeoutHandler: () => void

  constructor(runner: (...args: any[]) => void, delay: number) {
    this.timeoutToken = -1
    this.runner = runner
    this.timeout = delay
    this.timeoutHandler = this.onTimeout.bind(this)
  }

  /**
   * Dispose RunOnceScheduler
   */
  dispose(): void {
    this.cancel()
    this.runner = null
  }

  /**
   * Cancel current scheduled runner (if any).
   */
  cancel(): void {
    if (this.isScheduled()) {
      clearTimeout(this.timeoutToken)
      this.timeoutToken = -1
    }
  }

  /**
   * Cancel previous runner (if any) & schedule a new runner.
   */
  schedule(delay = this.timeout): void {
    this.cancel()
    this.timeoutToken = setTimeout(this.timeoutHandler, delay)
  }

  get delay(): number {
    return this.timeout
  }

  set delay(value: number) {
    this.timeout = value
  }

  /**
   * Returns true if scheduled.
   */
  isScheduled(): boolean {
    return this.timeoutToken !== -1
  }

  flush(): void {
    if (this.isScheduled()) {
      this.cancel()
      this.doRun()
    }
  }

  private onTimeout() {
    this.timeoutToken = -1
    if (this.runner)
      this.doRun()
  }

  protected doRun(): void {
    this.runner?.()
  }
}
