import { toDisposable } from '@livemoe/utils'
import { PlayerUI } from './player'
import { setWindowWorker as embedWindow, restoreWindowWorker } from '@livemoe/tools'

export class WallpaperPlayerUI extends PlayerUI {
  constructor() {
    super()

    embedWindow(this.hWnd)
    this._register(toDisposable(() => restoreWindowWorker()))
  }
}
