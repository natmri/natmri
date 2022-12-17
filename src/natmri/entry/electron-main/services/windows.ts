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

export class WindowService implements IWindowsService {
  getWindows(): BrowserWindow[] {
    throw new Error('Method not implemented.')
  }

  getWindowViews(): Electron.WebContents[] {
    throw new Error('Method not implemented.')
  }

  getWindow(): BrowserWindow {
    throw new Error('Method not implemented.')
  }

  createWindow(): BrowserWindow {
    throw new Error('Method not implemented.')
  }

  destoryWindow(): BrowserWindow {
    throw new Error('Method not implemented.')
  }

  openWindow(): BrowserWindow {
    throw new Error('Method not implemented.')
  }

  hideWindow(): BrowserWindow {
    throw new Error('Method not implemented.')
  }

  openDialog(): BrowserWindow {
    throw new Error('Method not implemented.')
  }

  hideDialog(): BrowserWindow {
    throw new Error('Method not implemented.')
  }
}
