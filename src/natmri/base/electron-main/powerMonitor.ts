import EventEmitter from 'node:events'
import { powerMonitor as _powerMonitor } from 'electron'
import { acquireShutdownBlock, insertWndProcHook, releaseShutdownBlock, removeWndProcHook, setMainWindowHandle } from '@livemoe/tools'
import { isWindows } from 'natmri/base/common/environment'
import { Disposable } from 'natmri/base/common/lifecycle'
import { Emitter, Event } from 'natmri/base/common/event'

type PowerMonitorEvent = 'suspend' | 'resume' | 'on-ac' | 'on-battery' | 'shutdown' | 'lock-screen' | 'unlock-screen' | 'user-did-groupe-active' | 'user-did-resign-active'

class ElectronShutdownHandler extends EventEmitter {
  constructor() {
    super()

    this.on('newListener', (event: string) => {
      if (event === 'shutdown' && this.listenerCount('shutdown') === 0) {
        // create native listener
        insertWndProcHook(() => {
          this.emit('shutdown')
        })
      }
    })

    this.on('removeListener', (event: string) => {
      if (event === 'shutdown' && this.listenerCount('shutdown') === 0) {
        // remove native listener
        removeWndProcHook()
      }
    })
  }

  setWindowHandle(handle: bigint): void {
    setMainWindowHandle(handle)
  }

  blockShutdown(reason: string): boolean {
    return acquireShutdownBlock(reason)
  }

  releaseShutdown(): boolean {
    return releaseShutdownBlock()
  }
}

interface INodeEventEmitter {
  addListener(eventName: string | symbol, listener: (...args: any[]) => void): this
  on(eventName: string | symbol, listener: (...args: any[]) => void): this
  removeListener(eventName: string | symbol, listener: (...args: any[]) => void): this
  removeAllListener(eventName: string | symbol): this
}

const electronShutdownHandler = new ElectronShutdownHandler()

/**
 * Native electron not support 'shutdown' event for windows
 *
 * The PowerMonitor patch native electron support 'shutdown' event for windows
 */
export class PowerMonitor extends Disposable implements INodeEventEmitter {
  private static _LOCK_WINDOW: bigint | undefined
  static SHUT_DOWN_REASON = '[Natmri] Please wait for some data to be saved'

  set LOCK_WINDOW(window: bigint | undefined) {
    PowerMonitor._LOCK_WINDOW = window
    this._onLockWindowSignal.fire()
  }

  get LOCK_WINDOW(): bigint | undefined { return PowerMonitor._LOCK_WINDOW }

  private readonly _onLockWindowSignal = this._register(new Emitter<void>())
  private readonly onLockWindowSignal = this._onLockWindowSignal.event
  private whenLockWindow() {
    if (!PowerMonitor._LOCK_WINDOW)
      return Event.toPromise(this.onLockWindowSignal)

    return Promise.resolve()
  }

  private wasBlockShutdown = false
  private _shutdownListener: Set<Function> = new Set()

  private _on(event: PowerMonitorEvent, listener: Function) {
    if (event !== 'shutdown')
      _powerMonitor.on(event as any, listener)

    /**
      * If you are in a non-Windows system, you don’t need to
      * listen to the `shutdown` event to execute the exit program,
      * because electron can call `app.quit()` to trigger `quit` related events(e.g. `will-quit` `before-quit` etc).
      */
    if (!isWindows)
      return this

    this.whenLockWindow()
      .then(() => {
        if (!this.wasBlockShutdown) {
          electronShutdownHandler.setWindowHandle(this.LOCK_WINDOW!)
          electronShutdownHandler.blockShutdown(PowerMonitor.SHUT_DOWN_REASON)

          electronShutdownHandler.on('shutdown', async () => {
            electronShutdownHandler.releaseShutdown()
            for (const func of this._shutdownListener)
              await func()
          })
        }
      })

    this._shutdownListener.add(listener)
    this.wasBlockShutdown = true

    return this
  }

  private _removeListener(event: PowerMonitorEvent, listener?: Function) {
    if (event !== 'shutdown') {
      if (listener)
        _powerMonitor.removeListener(event as any, listener)
      else
        _powerMonitor.removeAllListeners(event as any)
    }

    if (!isWindows)
      return this

    if (listener && this._shutdownListener.has(listener)) {
      this._shutdownListener.delete(listener)
    }
    else {
      this._shutdownListener.clear()
      removeWndProcHook()
      electronShutdownHandler.releaseShutdown()
    }

    return this
  }

  addListener(eventName: PowerMonitorEvent, listener: (...args: any[]) => void): this {
    return this._on(eventName, listener)
  }

  on(eventName: PowerMonitorEvent, listener: (...args: any[]) => void): this {
    return this._on(eventName, listener)
  }

  removeListener(eventName: PowerMonitorEvent, listener: (...args: any[]) => void): this {
    return this._removeListener(eventName, listener)
  }

  removeAllListener(eventName: PowerMonitorEvent): this {
    return this._removeListener(eventName)
  }
}

export const powerMonitor = new PowerMonitor()
