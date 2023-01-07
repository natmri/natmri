import type { BrowserView, Rectangle } from 'electron'
import type { Event } from 'natmri/base/common/event'
import type { URI } from 'natmri/base/common/uri'
import type { IWindowErrorEvent } from 'natmri/platform/window/electron-main/window'

export interface INativeBaseViewOptions extends Electron.WebPreferences {
  backgroundColor?: `#${string}`
}

export interface INatmriView {
  readonly onDidSignalReady: Event<void>
  readonly onDidClose: Event<void>
  readonly onDidDestroy: Event<void>
  readonly onDidWindowError: Event<IWindowErrorEvent>

  readonly id: number
  readonly view: BrowserView | null /** null dispose */

  readonly isReady: boolean
  ready(): Promise<INatmriView>
  setReady(): void

  setAutoResize(options: Electron.AutoResizeOptions): void

  getBounds(): Rectangle
  setBounds(bounds: Rectangle): void

  loadURL(uri: URI, options?: Electron.LoadURLOptions): Promise<void>

  send(channel: string, ...args: any[]): void
  sendWhenReady(channel: string, ...args: any[]): void
}
