import { toDisposable } from '@livemoe/utils'
import { setWindowWorker as embedWindow, restoreWindowWorker as restoreWindow } from '@livemoe/tools'
import { PlayerUI } from './player'

export class WallpaperPlayerUI extends PlayerUI {
  constructor() {
    super()

    embedWindow(this.hWnd)
    this._register(toDisposable(() => restoreWindow()))
  }
}
