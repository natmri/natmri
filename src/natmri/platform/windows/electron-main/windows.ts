import { createDecorator } from 'natmri/base/common/instantiation'
import type { BrowserView, WebContents } from 'electron'
import type { Event } from 'natmri/base/common/event'
import type { INativeBaseWindowOptions, INatmriWindow } from 'natmri/platform/window/electron-main/window'
import type { INativeBaseViewOptions, INatmriView } from 'natmri/platform/window/electron-main/view'

export interface IWindowsCountChangedEvent {
  readonly oldCount: number
  readonly newCount: number
}

export interface IWindowsMainService {
  readonly _serviceBrand: undefined

  readonly onDidChangeWindowsCount: Event<IWindowsCountChangedEvent>
  readonly onDidSignalReadyWindow: Event<INatmriWindow>
  readonly onDidTriggerSystemContextMenu: Event<{ window: INatmriWindow, x: number, y: number }>
  readonly onDidDestroyWindow: Event<INatmriWindow>

  getFocusedWindow(): INatmriWindow | undefined

  getWindow(config?: INativeBaseWindowOptions): INatmriWindow
  getView(config?: INativeBaseViewOptions): INatmriView

  getWindows(): INatmriWindow[]
  getViews(): INatmriView[]

  getWindowCount(): number
  getViewCount(): number

  getWindowById(windowId: number): INatmriWindow | undefined
  getViewById(viewId: number): INatmriView | undefined

  getWindowByWebContents(webContents: WebContents): INatmriWindow | undefined
  getWindowByBrowserView(browserView: BrowserView): INatmriWindow | undefined

  sendToAll(channel: string, ...args: any[]): void
  sendToFocused(channel: string, ...args: any[]): void
}

export const IWindowsMainService = createDecorator<IWindowsMainService>('windowsMainService')
