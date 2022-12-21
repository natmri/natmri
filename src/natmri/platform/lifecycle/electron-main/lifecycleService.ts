import { createDecorator } from '@livemoe/core'
import type { Event } from '@livemoe/utils'
import { Barrier, Disposable, Emitter, timeout } from '@livemoe/utils'
import { BrowserWindow, app } from 'electron'
import { isMacintosh } from 'natmri/base/common/environment'
import { powerMonitor } from 'natmri/base/electron-main/powerMonitor'
import { ILoggerService } from 'natmri/platform/log/common/log'

export interface ILifecycleService {
  /**
   * Will be true if the program was restarted (e.g. due to update)
   */
  readonly wasRestarted: boolean

  /**
   * Will be true if the OS was shutdown (e.g. reboot)
   */
  readonly shutdownRequested: boolean

  /**
   * Will be true if the program was requested quit
   */
  readonly quitRequested: boolean

  phase: LifecycleMainPhase

  /**
   * An event that fires when the application is about to shutdown before any window is closed.
   * The shutdown can still be prevented by any window that vetos this event.
   */
  readonly onBeforeShutdown: Event<void>

  /**
   * An event that fires after the onBeforeShutdown event has been fired and after no window has
   * vetoed the shutdown sequence. At this point listeners are ensured that the application will
   * quit without veto.
   */
  readonly onWillShutdown: Event<ShutdownEvent>

  /**
   * Restart the application with optional arguments (CLI). All lifecycle event handlers are triggered.
   */
  relaunch(options?: { addArgs?: string[]; removeArgs?: string[] }): Promise<void>

  /**
   * Shutdown the application normally. All lifecycle event handlers are triggered.
   */
  quit(willRestart?: boolean): Promise<boolean /* veto */>

  /**
   * Forcefully shutdown the application and optionally set an exit code.
   *
   * This method should only be used in rare situations where it is important
   * to set an exit code (e.g. running tests) or when the application is
   * not in a healthy state and should terminate asap.
   *
   * This method does not fire the normal lifecycle events to the windows,
   * that normally can be vetoed. Windows are destroyed without a chance
   * of components to participate. The only lifecycle event handler that
   * is triggered is `onWillShutdown` in the main process.
   */
  kill(code?: number): Promise<void>

  /**
   * Returns a promise that resolves when a certain lifecycle phase
   * has started.
   */
  when(phase: LifecycleMainPhase): Promise<void>
}

export enum LifecycleMainPhase {
  /**
   * The first phase signals that we are about to startup
   */
  Starting,

  /**
   * Services are ready and first window is about to show
   */
  Ready,

  /**
   * This phase signals a point in time after the window has opened
   * and is typically the best place to do work that is not required
   * for the window to open.
   */
  AfterWindowOpen,

  /**
   * The last phase after a window has opened and some time has passed
   * (2-5 seconds).
   */
  Eventually,
}

export const enum ShutdownReason {

  /**
   * The application exits normally.
   */
  QUIT = 1,

  /**
   * The application exits abnormally and is being
   * killed with an exit code.
   */
  KILL,

  /**
   * The operating system shutdown (e.g. reboot, shutdown)
   */
  SHUTDOWN,
}

export interface ShutdownEvent {

  /**
   * More details why the application is shutting down.
   */
  reason: ShutdownReason

  /**
   * Allows to join the shutdown. The promise can be a long running operation but it
   * will block the application from closing.
   */
  join(promise: Promise<void>): void
}

export const ILifecycleService = createDecorator<ILifecycleService>('ILifecycleService')

export class LifecycleService extends Disposable implements ILifecycleService {
  private static QUIT_AND_RESTART_KEY = 'lifecycle:quitAndRestart'
  private static SHUTDOWN_KEY = 'lifecycle:shutdown'

  private readonly _onBeforeShutdown = this._register(new Emitter<void>())
  readonly onBeforeShutdown = this._onBeforeShutdown.event

  private readonly _onWillShutdown = this._register(new Emitter<ShutdownEvent>())
  readonly onWillShutdown = this._onWillShutdown.event

  private _quitRequested = false
  get quitRequested(): boolean { return this._quitRequested }

  private _wasRestarted = false
  get wasRestarted(): boolean { return this._wasRestarted }

  private _shutdownRequested = false
  get shutdownRequested(): boolean { return this._shutdownRequested }

  private _phase = LifecycleMainPhase.Starting
  get phase(): LifecycleMainPhase { return this._phase }

  private pendingQuitPromise: Promise<boolean> | undefined = undefined
  private pendingQuitPromiseResolve: { (veto: boolean): void } | undefined = undefined

  private pendingWillShutdownPromise: Promise<void> | undefined = undefined

  private readonly phaseWhen = new Map<LifecycleMainPhase, Barrier>()

  constructor(
    @ILoggerService private readonly logService: ILoggerService,
  ) {
    super()

    this.when(LifecycleMainPhase.Ready).then(() => this.registerListeners())
  }

  private resolvePendingQuitPromise(veto: boolean): void {
    if (this.pendingQuitPromiseResolve) {
      this.pendingQuitPromiseResolve(veto)
      this.pendingQuitPromiseResolve = undefined
      this.pendingQuitPromise = undefined
    }
  }

  private registerListeners(): void {
    // shutdown
    powerMonitor.on('shutdown', async () => {
      this._shutdownRequested = true

      // OS shutdown, try normal quit application
      await this.quit(false)
    })

    // before-quit: an event that is fired if application quit was
    // requested but before any window was closed.
    const beforeQuitListener = () => {
      if (this._quitRequested)
        return

      this.logService.trace('Lifecycle#app.on(before-quit)')
      this._quitRequested = true

      // Emit event to indicate that we are about to shutdown
      this.logService.trace('Lifecycle#onBeforeShutdown.fire()')
      this._onBeforeShutdown.fire()

      // macOS: can run without any window open. in that case we fire
      // the onWillShutdown() event directly because there is no veto
      // to be expected.
      if (isMacintosh && BrowserWindow.getAllWindows().length === 0)
        this.fireOnWillShutdown(ShutdownReason.QUIT)
    }
    app.on('before-quit', beforeQuitListener)

    // window-all-closed: an event that only fires when the last window
    // was closed. We override this event to be in charge if app.quit()
    // should be called or not.
    const windowAllClosedListener = () => {
      this.trace('Lifecycle#app.on(window-all-closed)')

      // Windows/Linux: we quit when all windows have closed
      // Mac: we only quit when quit was requested
      if (this._quitRequested || !isMacintosh)
        app.quit()
    }
    app.on('window-all-closed', windowAllClosedListener)

    // will-quit: an event that is fired after all windows have been
    // closed, but before actually quitting.
    app.once('will-quit', (e) => {
      this.trace('Lifecycle#app.on(will-quit)')

      // Prevent the quit until the shutdown promise was resolved
      e.preventDefault()

      // Start shutdown sequence
      const shutdownPromise = this.fireOnWillShutdown(this.shutdownRequested ? ShutdownReason.SHUTDOWN : ShutdownReason.QUIT)

      // Wait until shutdown is signaled to be complete
      shutdownPromise.finally(() => {
        // Resolve pending quit promise now without veto
        this.resolvePendingQuitPromise(false /* no veto */)

        // Quit again, this time do not prevent this, since our
        // will-quit listener is only installed "once". Also
        // remove any listener we have that is no longer needed
        app.removeListener('before-quit', beforeQuitListener)
        app.removeListener('window-all-closed', windowAllClosedListener)
        app.quit()
      })
    })
  }

  private fireOnWillShutdown(reason: ShutdownReason): Promise<void> {
    if (this.pendingWillShutdownPromise)
      return this.pendingWillShutdownPromise // shutdown is already running

    this.trace('Lifecycle#onWillShutdown.fire()')

    const joiners: Promise<void>[] = []

    this._onWillShutdown.fire({
      reason,
      join(promise) {
        joiners.push(promise)
      },
    })

    this.pendingWillShutdownPromise = (async () => {
      // Settle all shutdown event joiners
      try {
        await Promise.allSettled(joiners)
      }
      catch (error) {
        this.logService.error(error as Error)
      }
    })()

    return this.pendingWillShutdownPromise
  }

  set phase(value: LifecycleMainPhase) {
    if (value < this.phase)
      throw new Error('Lifecycle cannot go backwards')

    if (this._phase === value)
      return

    this.logService.trace(`lifecycle (main): phase changed (value: ${value})`)

    this._phase = value

    const barrier = this.phaseWhen.get(this._phase)
    if (barrier) {
      barrier.open()
      this.phaseWhen.delete(this._phase)
    }
  }

  async when(phase: LifecycleMainPhase): Promise<void> {
    if (phase <= this._phase)
      return

    let barrier = this.phaseWhen.get(phase)
    if (!barrier) {
      barrier = new Barrier()
      this.phaseWhen.set(phase, barrier)
    }

    await barrier.wait()
  }

  quit(willRestart: boolean | undefined, willshutdown?: boolean): Promise<boolean /* veto */> {
    this.trace(`Lifecycle#quit() - begin (willRestart: ${willRestart})`)
    this.trace(`Lifecycle#quit() - begin (willshutdown: ${willshutdown})`)

    if (this.pendingQuitPromise) {
      this.trace('Lifecycle#quit() - returning pending quit promise')

      return this.pendingQuitPromise
    }

    // Remember if we are about to restart
    // if (willRestart)
    // this.stateMainService.setItem(LifecycleMainService.QUIT_AND_RESTART_KEY, true)

    this.pendingQuitPromise = new Promise((resolve) => {
      // Store as field to access it from a window cancellation
      this.pendingQuitPromiseResolve = resolve

      // Calling app.quit() will trigger the close handlers of each opened window
      // and only if no window vetoed the shutdown, we will get the will-quit event
      this.trace('Lifecycle#quit() - calling app.quit()')
      app.quit()
    })

    return this.pendingQuitPromise
  }

  trace(msg: string) {
    this.logService.trace(msg)
  }

  async relaunch(options?: { addArgs?: string[]; removeArgs?: string[] }): Promise<void> {
    this.trace('Lifecycle#relaunch()')

    const args = process.argv.slice(1)
    if (options?.addArgs)
      args.push(...options.addArgs)

    if (options?.removeArgs) {
      for (const a of options.removeArgs) {
        const idx = args.indexOf(a)
        if (idx >= 0)
          args.splice(idx, 1)
      }
    }

    const quitListener = () => {
      // Windows: we are about to restart and as such we need to restore the original
      // current working directory we had on startup to get the exact same startup
      // behaviour. As such, we briefly change back to that directory and then when
      // Code starts it will set it back to the installation directory again.

      // relaunch after we are sure there is no veto
      this.trace('Lifecycle#relaunch() - calling app.relaunch()')
      app.relaunch({ args })
    }
    app.once('quit', quitListener)

    // `app.relaunch()` does not quit automatically, so we quit first,
    // check for vetoes and then relaunch from the `app.on('quit')` event
    const veto = await this.quit(true /* will restart */)
    if (veto)
      app.removeListener('quit', quitListener)
  }

  async kill(code?: number): Promise<void> {
    this.trace('Lifecycle#kill()')

    // Give main process participants a chance to orderly shutdown
    await this.fireOnWillShutdown(ShutdownReason.KILL)

    // From extension tests we have seen issues where calling app.exit()
    // with an opened window can lead to native crashes (Linux). As such,
    // we should make sure to destroy any opened window before calling
    // `app.exit()`.
    //
    // Note: Electron implements a similar logic here:
    // https://github.com/electron/electron/blob/fe5318d753637c3903e23fc1ed1b263025887b6a/spec-main/window-helpers.ts#L5

    await Promise.race([

      // Still do not block more than 1s
      timeout(1000),

      // Destroy any opened window: we do not unload windows here because
      // there is a chance that the unload is veto'd or long running due
      // to a participant within the window. this is not wanted when we
      // are asked to kill the application.
      (async () => {
        for (const window of BrowserWindow.getAllWindows()) {
          if (window && !window.isDestroyed()) {
            let whenWindowClosed: Promise<void>
            if (window.webContents && !window.webContents.isDestroyed())
              whenWindowClosed = new Promise(resolve => window.once('closed', resolve))

            else
              whenWindowClosed = Promise.resolve()

            window.destroy()
            await whenWindowClosed
          }
        }
      })(),
    ])

    // Now exit either after 1s or all windows destroyed
    app.exit(code)
  }
}
