import { createDecorator } from '@livemoe/core'
import type { BrowserWindow, WebContents } from 'electron'

export interface IWindowsService {
  getWindows(): BrowserWindow[]
  getWindowViews(): WebContents[]

  getWindow(): BrowserWindow
  createWindow(): BrowserWindow
  destoryWindow(): BrowserWindow

  openWindow(): BrowserWindow
  hideWindow(): BrowserWindow

  openDialog(): BrowserWindow
  hideDialog(): BrowserWindow
}

export const IWindowService = createDecorator<IWindowsService>('IWindowService')

export class WindowService {}
