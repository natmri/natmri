import { BrowserWindow } from 'electron'
import { CancellationToken } from 'natmri/base/common/cancellation'
import { Emitter } from 'natmri/base/common/event'
import { IInstantiationService } from 'natmri/base/common/instantiation'
import { Disposable } from 'natmri/base/common/lifecycle'
import { ILoggerService } from 'natmri/platform/log/common/log'
import { once } from 'natmri/base/common/functional'
import { NatmriWindow } from 'natmri/platform/windows/electron-main/windowImpl'
import { NatmriView } from 'natmri/platform/windows/electron-main/viewImpl'
import { mark } from 'natmri/base/common/performance'
import { ILifecycleMainService } from 'natmri/platform/lifecycle/electron-main/lifecycleMainService'
import { assertIsDefined } from 'natmri/base/common/types'
import type { Event } from 'natmri/base/common/event'
import type { INativeBaseWindowOptions, INatmriWindow } from 'natmri/platform/window/electron-main/window'
import type { INativeBaseViewOptions, INatmriView } from 'natmri/platform/window/electron-main/view'
import type { IWindowsCountChangedEvent, IWindowsMainService } from 'natmri/platform/windows/electron-main/windows'

export class WindowsMainService extends Disposable implements IWindowsMainService {
  declare readonly _serviceBrand: undefined

  private readonly _onDidSingalReadyWindow: Emitter<INatmriWindow> = this._register(new Emitter<INatmriWindow>())
  readonly onDidSignalReadyWindow: Event<INatmriWindow> = this._onDidSingalReadyWindow.event

  private readonly _onDidChangeWindowsCount: Emitter<IWindowsCountChangedEvent> = this._register(new Emitter<IWindowsCountChangedEvent>())
  readonly onDidChangeWindowsCount: Event<IWindowsCountChangedEvent> = this._onDidChangeWindowsCount.event

  private readonly _onDidTriggerSystemContextMenu: Emitter<{ window: INatmriWindow; x: number; y: number }> = this._register(new Emitter<{ window: INatmriWindow; x: number; y: number }>())
  readonly onDidTriggerSystemContextMenu: Event<{ window: INatmriWindow; x: number; y: number }> = this._onDidTriggerSystemContextMenu.event

  private readonly _onDidDestroyWindow: Emitter<INatmriWindow> = this._register(new Emitter<INatmriWindow>())
  readonly onDidDestroyWindow: Event<INatmriWindow> = this._onDidDestroyWindow.event

  private static readonly WINDOWS: INatmriWindow[] = []
  private static readonly VIEWS: INatmriView[] = []

  constructor(
    @IInstantiationService private readonly instantiationService: IInstantiationService,
    @ILifecycleMainService private readonly lifecycleMainService: ILifecycleMainService,
    @ILoggerService private readonly logService: ILoggerService,
  ) {
    super()

    this.onDidChangeWindowsCount((e) => {
      this.logService.info('onDidChangeWindowsCount', e)
    })
  }

  private onWindowClosed(window: INatmriWindow) {
    // Remove from our list so that Electron can clean it up
    const index = WindowsMainService.WINDOWS.indexOf(window)
    WindowsMainService.WINDOWS.splice(index, 1)

    this._onDidChangeWindowsCount.fire({ oldCount: this.getWindowCount() + 1, newCount: this.getWindowCount() })
  }

  getFocusedWindow(): INatmriWindow | undefined {
    return this.getWindows().filter(window => window.win?.isFocused())[0]
  }

  getWindow(config: INativeBaseWindowOptions = {}): INatmriWindow {
    mark('store/willCreateNatmriWindow')
    const createdWindow = this.instantiationService.createInstance(NatmriWindow, config)
    mark('store/didCreateNatmriWindow')
    WindowsMainService.WINDOWS.push(createdWindow)
    this._onDidChangeWindowsCount.fire({ oldCount: this.getWindowCount() - 1, newCount: this.getWindowCount() })

    // Window Events
    once(createdWindow.onDidSignalReady)(() => this._onDidSingalReadyWindow.fire(createdWindow))
    once(createdWindow.onDidClose)(() => this.onWindowClosed(createdWindow))
    once(createdWindow.onDidDestroy)(() => this._onDidDestroyWindow.fire(createdWindow))
    createdWindow.onDidTriggerSystemContextMenu(({ x, y }) => this._onDidTriggerSystemContextMenu.fire({ window: createdWindow, x, y }))

    const webContents = assertIsDefined(createdWindow.win?.webContents)
    webContents.removeAllListeners('devtools-reload-page') // remove built in listener so we can handle this on our own
    webContents.on('devtools-reload-page', () => this.lifecycleMainService.reload(createdWindow))

    // Lifecycle
    this.lifecycleMainService.registerWindow(createdWindow)

    return createdWindow
  }

  getView(config: INativeBaseViewOptions = {}): INatmriView {
    mark('store/willCreateNatmriView')
    const createdView = this.instantiationService.createInstance(NatmriView, config)
    mark('store/didCreateNatmriView')
    WindowsMainService.VIEWS.push(createdView)

    return createdView
  }

  getWindows(): INatmriWindow[] {
    return WindowsMainService.WINDOWS
  }

  getViews(): INatmriView[] {
    return WindowsMainService.VIEWS
  }

  getWindowCount() {
    return WindowsMainService.WINDOWS.length
  }

  getViewCount(): number {
    return WindowsMainService.VIEWS.length
  }

  getWindowById(windowId: number): INatmriWindow | undefined {
    const windows = this.getWindows().filter(window => window.id === windowId)

    return windows[0]
  }

  getViewById(viewId: number): INatmriView | undefined {
    const views = this.getViews().filter(view => view.id === viewId)

    return views[0]
  }

  getWindowByWebContents(webContents: Electron.WebContents): INatmriWindow | undefined {
    const browserWindow = BrowserWindow.fromWebContents(webContents)

    if (!browserWindow)
      return undefined

    return this.getWindowById(browserWindow.id)
  }

  getWindowByBrowserView(browserView: Electron.BrowserView): INatmriWindow | undefined {
    const browserWindow = BrowserWindow.fromBrowserView(browserView)

    if (!browserWindow)
      return undefined

    return this.getWindowById(browserWindow.id)
  }

  sendToAll(channel: string, ...args: any[]): void {
    for (const window of [...this.getWindows(), ...this.getViews()])
      window.sendWhenReady(channel, CancellationToken.None, ...args)
  }

  sendToFocused(channel: string, ...args: any[]): void {
    for (const window of [this.getFocusedWindow()])
      window?.sendWhenReady(channel, CancellationToken.None, ...args)
  }
}
