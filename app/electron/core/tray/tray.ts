import type { BrowserWindow } from 'electron'

export interface ITray {

}

export class Tray implements ITray {
  private ui: BrowserWindow
}
