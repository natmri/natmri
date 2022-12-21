import { setWindowWorker as embedWindow, restoreWindowWorker as restoreWindow } from '@livemoe/tools'
import { toDisposable } from 'natmri/base/common/lifecycle'
import { PlayerUI } from './player'

export class WallpaperPlayerUI extends PlayerUI {
  constructor() {
    super()

    embedWindow(this.hWnd)
    this._register(toDisposable(() => restoreWindow()))
  }
}
