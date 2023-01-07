import { BrowserView } from 'electron'
import { Emitter } from 'natmri/base/common/event'
import { Disposable } from 'natmri/base/common/lifecycle'
import { toErrorMessage } from 'natmri/base/common/errors'
import { ErrorReason } from 'natmri/platform/window/electron-main/window'
import { ReadyState } from 'natmri/platform/windows/electron-main/windowImpl'
import { ILoggerService } from 'natmri/platform/log/common/log'
import type { URI } from 'natmri/base/common/uri'
import type { Event } from 'natmri/base/common/event'
import type { CancellationToken } from 'natmri/base/common/cancellation'
import type { IWindowErrorEvent } from 'natmri/platform/window/electron-main/window'
import type { INativeBaseViewOptions, INatmriView } from 'natmri/platform/window/electron-main/view'

export class NatmriView extends Disposable implements INatmriView {
  protected _onDidSignalReady = this._register(new Emitter<void>())
  readonly onDidSignalReady: Event<void> = this._onDidSignalReady.event

  protected _onDidClose = this._register(new Emitter<void>())
  readonly onDidClose: Event<void> = this._onDidClose.event

  protected _onDidDestroy = this._register(new Emitter<void>())
  readonly onDidDestroy: Event<void> = this._onDidDestroy.event

  protected _onDidWindowError = this._register(new Emitter<IWindowErrorEvent>())
  readonly onDidWindowError: Event<IWindowErrorEvent> = this._onDidWindowError.event

  protected _view: BrowserView
  get view(): BrowserView | null { return this._view }

  protected _id: number
  get id() { return this._id }

  protected whenReadyCallbacks: { (window: INatmriView): void }[] = []

  constructor(
    config: INativeBaseViewOptions,
    @ILoggerService protected readonly logService: ILoggerService,
  ) {
    super()

    const { backgroundColor = '#000000', ...options } = config

    this._view = new BrowserView({
      webPreferences: {
        ...options,
      },
    })
    this._id = this._view.webContents.id
    this._view.setBackgroundColor(backgroundColor)
    this.registerListeners()
  }

  protected readyState = ReadyState.None

  get isReady(): boolean {
    return this.readyState === ReadyState.Ready
  }

  private registerListeners() {
    // Window error conditions to handle
    this._view.webContents.on('unresponsive', () => this._onDidWindowError.fire({ type: ErrorReason.UNRESPONSIVE }))
    this._view.webContents.on('render-process-gone', (_event, details) => this._onDidWindowError.fire({ type: ErrorReason.PROCESS_GONE, details }))
    this._view.webContents.on('did-fail-load', (_event, exitCode, reason) => this._onDidWindowError.fire({ type: ErrorReason.LOAD, details: { reason, exitCode } }))

    // Prevent windows/iframes from blocking the unload
    // through DOM events. We have our own logic for
    // unloading a window that should not be confused
    // with the DOM way.
    this._view.webContents.on('will-prevent-unload', (event) => {
      event.preventDefault()
    })
  }

  ready(): Promise<INatmriView> {
    return new Promise<INatmriView>((resolve) => {
      if (this.isReady)
        return resolve(this)

      // otherwise keep and call later when we are ready
      this.whenReadyCallbacks.push(resolve)
    })
  }

  setReady(): void {
    this.logService.trace(`window#load: window reported ready (id: ${this._id})`)

    this.readyState = ReadyState.Ready

    // inform all waiting promises that we are ready now
    while (this.whenReadyCallbacks.length)
      this.whenReadyCallbacks.pop()!(this)

    // Events
    this._onDidSignalReady.fire()
  }

  setAutoResize(options: Electron.AutoResizeOptions): void {
    this._view.setAutoResize(options)
  }

  setBounds(bounds: Electron.Rectangle): void {
    this._view.setBounds(bounds)
  }

  getBounds(): Electron.Rectangle {
    return this._view.getBounds()
  }

  loadURL(uri: URI, options?: Electron.LoadURLOptions): Promise<void> {
    this.readyState = ReadyState.Navigating
    return this._view.webContents.loadURL(uri.toString(true), options)
  }

  sendWhenReady(channel: string, token: CancellationToken, ...args: any[]): void {
    if (this.isReady) {
      this.send(channel, ...args)
    }
    else {
      this.ready().then(() => {
        if (!token.isCancellationRequested)
          this.send(channel, ...args)
      })
    }
  }

  send(channel: string, ...args: any[]): void {
    if (this._view) {
      if (this._view.webContents.isDestroyed()) {
        this.logService.warn(`Sending IPC message to channel '${channel}' for window that is destroyed`)
        return
      }

      try {
        this._view.webContents.send(channel, ...args)
      }
      catch (error) {
        this.logService.warn(`Error sending IPC message to channel '${channel}' of window ${this._id}: ${toErrorMessage(error)}`)
      }
    }
  }
}
