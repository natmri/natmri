import EventEmitter from 'node:events'
import { powerMonitor as _powerMonitor } from 'electron'
import { acquireShutdownBlock, insertWndProcHook, releaseShutdownBlock, removeWndProcHook, setMainWindowHandle } from '@livemoe/tools'
import { isWindows } from 'natmri/base/common/environment'

type PowerMonitorEvent = 'suspend' | 'resume' | 'on-ac' | 'on-battery' | 'shutdown' | 'lock-screen' | 'unlock-screen' | 'user-did-groupe-active' | 'user-did-resign-active'

class ElectronShutdownHandlerClass extends EventEmitter {
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

export interface INodeEventEmitter {
  addListener(eventName: string | symbol, listener: (...args: any[]) => void): this
  on(eventName: string | symbol, listener: (...args: any[]) => void): this
  removeListener(eventName: string | symbol, listener: (...args: any[]) => void): this
  removeAllListener(eventName: string | symbol): this
}

const ElectronShutdownHandler = new ElectronShutdownHandlerClass()

/**
 * Native electron not support 'shutdown' event for windows
 *
 * The PowerMonitor patch native electron support 'shutdown' event for windows
 */
export class PowerMonitor implements INodeEventEmitter {
  static LOCK_WINDOW: bigint | undefined
  static SHUT_DOWN_REASON = '[Natmri] Please wait for some data to be saved'

  private wasBlockShutdown = false
  private _shutdownListener: Set<Function> = new Set()

  private validatedEvent(event: string) {
    return event === 'shutdown' && isWindows
  }

  private _on(event: PowerMonitorEvent, listener: Function) {
    if (!this.validatedEvent(event))
      _powerMonitor.on(event as any, listener)

    if (!PowerMonitor.LOCK_WINDOW)
      throw new Error('it should be provided LOCK_WINDOW')

    if (!this.wasBlockShutdown) {
      ElectronShutdownHandler.setWindowHandle(PowerMonitor.LOCK_WINDOW)
      ElectronShutdownHandler.blockShutdown(PowerMonitor.SHUT_DOWN_REASON)

      ElectronShutdownHandler.on('shutdown', async () => {
        ElectronShutdownHandler.releaseShutdown()
        for (const func of this._shutdownListener)
          await func()
      })

      this.wasBlockShutdown = true
    }

    this._shutdownListener.add(listener)

    return this
  }

  private _removeListener(event: PowerMonitorEvent, listener?: Function) {
    if (!this.validatedEvent(event)) {
      if (listener)
        _powerMonitor.removeListener(event as any, listener)
      else
        _powerMonitor.removeAllListeners(event as any)
    }

    if (listener && this._shutdownListener.has(listener)) {
      this._shutdownListener.delete(listener)
    }
    else {
      this._shutdownListener.clear()
      ElectronShutdownHandler.releaseShutdown()
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
