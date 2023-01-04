import { BrowserWindow, app, screen, systemPreferences } from 'electron'
import { Emitter } from 'natmri/base/common/event'
import { Disposable } from 'natmri/base/common/lifecycle'
import { toErrorMessage } from 'natmri/base/common/errors'
import { DeferredPromise, timeout } from 'natmri/base/common/async'
import { isMacintosh, isWindows } from 'natmri/base/common/environment'
import { ErrorReason } from 'natmri/platform/window/electron-main/window'
import type { BrowserWindowConstructorOptions } from 'electron'
import type { CancellationToken } from 'natmri/base/common/cancellation'
import type { ILoggerService } from 'natmri/platform/log/common/log'
import type { INativeBaseWindowOptions, INatmriBaseWindow, IWindowErrorEvent } from 'natmri/platform/window/electron-main/window'

export const enum ReadyState {
  None,
  Navigating,
  Ready,
}

export class NatmriBaseWindow extends Disposable implements INatmriBaseWindow {
  protected _onDidSignalReady = this._register(new Emitter<void>())
  readonly onDidSignalReady = this._onDidSignalReady.event

  protected readonly _onDidTriggerSystemContextMenu = this._register(new Emitter<{ x: number; y: number }>())
  readonly onDidTriggerSystemContextMenu = this._onDidTriggerSystemContextMenu.event

  protected readonly _onDidClose = this._register(new Emitter<void>())
  readonly onDidClose = this._onDidClose.event

  protected readonly _onDidDestroy = this._register(new Emitter<void>())
  readonly onDidDestroy = this._onDidDestroy.event

  protected readonly _onDidWindowError = this._register(new Emitter<IWindowErrorEvent>())
  readonly onDidWindowError = this._onDidWindowError.event

  protected hasWindowControlOverlay = false

  protected _win: BrowserWindow
  get win(): BrowserWindow | null { return this._win }

  protected _id: number
  get id() { return this.id }

  protected _nativeWindowId: Buffer
  get nativeWindowId() { return this._nativeWindowId }

  protected transientIsNativeFullScreen: boolean | undefined = undefined
  protected joinNativeFullScreenTransition: DeferredPromise<void> | undefined = undefined

  protected whenReadyCallbacks: { (window: INatmriBaseWindow): void }[] = []

  constructor(
    config: INativeBaseWindowOptions,
    protected readonly logService: ILoggerService,
  ) {
    super()

    const { titleBarStyle = 'custom', ..._options } = config
    const useCustomTitleStyle = titleBarStyle === 'custom'
    const options: BrowserWindowConstructorOptions = _options

    if (isWindows && !systemPreferences.isAeroGlassEnabled()) {
      this.logService.warn('[NatmriBaseWindow] transparent options must be enable aero in the Windows.')
      options.transparent = false
    }

    if (useCustomTitleStyle) {
      options.frame = false
      // custom title bar style
      options.titleBarStyle = 'hidden'
      options.titleBarOverlay = {
        height: 29, // the smallest size of the title bar on windows accounting for the border on windows 11
        color: '#F8F8F8', // TODO: theme color
        symbolColor: '#FFFFFF',
      }

      this.hasWindowControlOverlay = true
    }

    this._win = new BrowserWindow(options)
    this._id = this._win.id
    this._nativeWindowId = this._win.getNativeWindowHandle()

    // Windows Custom System Context Menu
    // See https://github.com/electron/electron/issues/24893
    //
    // The purpose of this is to allow for the context menu in the Windows Title Bar
    //
    // Currently, all mouse events in the title bar are captured by the OS
    // thus we need to capture them here with a window hook specific to Windows
    // and then forward them to the correct window.
    if (isWindows) {
      const WM_INITMENU = 0x0116 // https://docs.microsoft.com/en-us/windows/win32/menurc/wm-initmenu
      this._win.hookWindowMessage(WM_INITMENU, () => {
        const [x, y] = this._win.getPosition()
        const cursorPos = screen.getCursorScreenPoint()
        const cx = cursorPos.x - x
        const cy = cursorPos.y - y

        // In some cases, show the default system context menu
        // 1) The mouse position is not within the title bar
        // 2) The mouse position is within the title bar, but over the app icon
        // We do not know the exact title bar height but we make an estimate based on window height
        const shouldTriggerDefaultSystemContextMenu = () => {
          // Use the custom context menu when over the title bar, but not over the app icon
          // The app icon is estimated to be 30px wide
          // The title bar is estimated to be the max of 35px and 15% of the window height
          if (cx > 30 && cy >= 0 && cy <= Math.max(this._win.getBounds().height * 0.15, 35))
            return false

          return true
        }

        if (!shouldTriggerDefaultSystemContextMenu()) {
          // This is necessary to make sure the native system context menu does not show up.
          this._win.setEnabled(false)
          this._win.setEnabled(true)

          this._onDidTriggerSystemContextMenu.fire({ x: cx, y: cy })
        }
        return 0
      })
    }

    if (isMacintosh && useCustomTitleStyle)
      this._win.setSheetOffset(22) // offset dialogs by the height of the custom title bar if we have any

    this.registerListeners()
  }

  protected readyState = ReadyState.None

  get isReady() {
    return this.readyState === ReadyState.Ready
  }

  ready(): Promise<INatmriBaseWindow> {
    return new Promise<INatmriBaseWindow>((resolve) => {
      if (this.isReady)
        return resolve(this)

      // otherwise keep and call later when we are ready
      this.whenReadyCallbacks.push(resolve)
    })
  }

  setReady() {
    this.logService.trace(`window#load: window reported ready (id: ${this._id})`)

    this.readyState = ReadyState.Ready

    // inform all waiting promises that we are ready now
    while (this.whenReadyCallbacks.length)
      this.whenReadyCallbacks.pop()!(this)

    // Events
    this._onDidSignalReady.fire()
  }

  private registerListeners() {
    // Window error conditions to handle
    this._win.on('unresponsive', () => this._onDidWindowError.fire({ type: ErrorReason.UNRESPONSIVE }))
    this._win.webContents.on('render-process-gone', (_event, details) => this._onDidWindowError.fire({ type: ErrorReason.PROCESS_GONE, details }))
    this._win.webContents.on('did-fail-load', (_event, exitCode, reason) => this._onDidWindowError.fire({ type: ErrorReason.LOAD, details: { reason, exitCode } }))

    // Prevent windows/iframes from blocking the unload
    // through DOM events. We have our own logic for
    // unloading a window that should not be confused
    // with the DOM way.
    this._win.webContents.on('will-prevent-unload', (event) => {
      event.preventDefault()
    })

    this._win.on('closed', () => {
      this._onDidClose.fire()

      this.dispose()
    })

    this._win.on('enter-full-screen', () => {
      this.joinNativeFullScreenTransition?.complete()
      this.joinNativeFullScreenTransition = undefined
    })

    this._win.on('leave-full-screen', () => {
      this.joinNativeFullScreenTransition?.complete()
      this.joinNativeFullScreenTransition = undefined
    })
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
    if (this._win) {
      if (this._win.isDestroyed() || this._win.webContents.isDestroyed()) {
        this.logService.warn(`Sending IPC message to channel '${channel}' for window that is destroyed`)
        return
      }

      try {
        this._win.webContents.send(channel, ...args)
      }
      catch (error) {
        this.logService.warn(`Error sending IPC message to channel '${channel}' of window ${this._id}: ${toErrorMessage(error)}`)
      }
    }
  }

  get isFullScreen() {
    if (isMacintosh && typeof this.transientIsNativeFullScreen === 'boolean')
      return this.transientIsNativeFullScreen

    return this._win.isFullScreen() || this._win.isSimpleFullScreen()
  }

  isMinimized() {
    return this._win.isMinimized()
  }

  protected setFullScreen(fullscreen: boolean): void {
    // Set fullscreen state
    this.setNativeFullScreen(fullscreen)
  }

  protected setNativeFullScreen(fullscreen: boolean): void {
    if (this._win.isSimpleFullScreen())
      this._win.setSimpleFullScreen(false)

    this.doSetNativeFullScreen(fullscreen)
  }

  protected doSetNativeFullScreen(fullscreen: boolean): void {
    if (isMacintosh) {
      this.transientIsNativeFullScreen = fullscreen
      this.joinNativeFullScreenTransition = new DeferredPromise<void>()
      Promise.race([
        this.joinNativeFullScreenTransition.p,
        timeout(1000), // still timeout after some time in case we miss the event
      ]).finally(() => this.transientIsNativeFullScreen = undefined)
    }

    this._win.setFullScreen(fullscreen)
  }

  setSimpleFullScreen(fullscreen: boolean): void {
    if (this._win.isFullScreen())
      this.doSetNativeFullScreen(false)

    this._win.setSimpleFullScreen(fullscreen)
    this._win.webContents.focus() // workaround issue where focus is not going into window
  }

  toggleFullScreen(): void {
    this.setFullScreen(!this.isFullScreen)
  }

  getBounds(): Electron.Rectangle {
    const [x, y] = this._win.getPosition()
    const [width, height] = this._win.getSize()

    return { x, y, width, height }
  }

  focus(options?: { force: boolean }): void {
    // macOS: Electron > 7.x changed its behaviour to not
    // bring the application to the foreground when a window
    // is focused programmatically. Only via `app.focus` and
    // the option `steal: true` can you get the previous
    // behaviour back. The only reason to use this option is
    // when a window is getting focused while the application
    // is not in the foreground.
    if (isMacintosh && options?.force)
      app.focus({ steal: true })

    if (!this._win)
      return

    if (this._win.isMinimized())
      this._win.restore()

    this._win.focus()
  }

  close(): void {
    this._win?.close()
  }

  override dispose(): void {
    super.dispose()

    this._win = null! // Important to dereference the window object to allow for GC
  }
}
