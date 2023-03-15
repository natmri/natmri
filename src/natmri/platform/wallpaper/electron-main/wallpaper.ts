import { join } from 'node:path'
import { screen } from 'electron'
import { createInteractiveWindow, destroyInteractiveWindow } from '@natmri/platform'
import { Disposable, toDisposable } from 'natmri/base/common/lifecycle'
import { IWindowsMainService } from 'natmri/platform/windows/electron-main/windows'
import { isWindows } from 'natmri/base/common/environment'
import { INativeEnvironmentMainService } from 'natmri/platform/environment/electron-main/environmentMainService'
import { powerMonitor } from 'natmri/base/electron-main/powerMonitor'
import { ILoggerService } from 'natmri/platform/log/common/log'
import { ILifecycleMainService } from 'natmri/platform/lifecycle/electron-main/lifecycleMainService'
import type { Display } from 'electron'
import type { INatmriWindow } from 'natmri/platform/window/electron-main/window'

export class WallpaperPlayer extends Disposable {
  private _natmri_win: INatmriWindow = null!
  private display: Display = screen.getPrimaryDisplay()

  constructor(
    @ILoggerService private readonly logService: ILoggerService,
    @IWindowsMainService private readonly windowsMainService: IWindowsMainService,
    @INativeEnvironmentMainService private readonly environmentMainService: INativeEnvironmentMainService,
    @ILifecycleMainService private readonly lifecycleMainService: ILifecycleMainService,
  ) {
    super()

    const { workAreaSize } = this.display
    this._natmri_win = this.windowsMainService.getWindow({
      show: false,
      title: 'Wallpaper - Engine', // default title
      titleBarStyle: 'native',
      skipTaskbar: true,
      x: 0,
      y: 0,
      width: workAreaSize.width,
      height: workAreaSize.height,
      minWidth: workAreaSize.width,
      minHeight: workAreaSize.height,
      maxWidth: workAreaSize.width,
      maxHeight: workAreaSize.height,
      frame: false,
      movable: false,
      transparent: false,
      hasShadow: false,
      closable: false,
      focusable: true,
      fullscreen: true,
      fullscreenable: true,
      resizable: false,
      roundedCorners: false,
      thickFrame: false,
      autoHideMenuBar: true,
      type: 'desktop',
      webPreferences: {
        spellcheck: false,
        enableWebSQL: false,
        defaultEncoding: 'utf8',
        experimentalFeatures: true,
        disableHtmlFullscreenWindowResize: true,
        scrollBounce: true,
        preload: join(this.environmentMainService.preloadPath, 'natmri/platform/wallpaper/electron-preload/wallpaper.js'),
      },
    })

    this.lifecycleMainService.onBeforeShutdown(() => {
      this.dispose()
    })

    if (isWindows) {
      // windows shutdown lock window
      powerMonitor.LOCK_WINDOW = this._natmri_win.nativeWindowId.readBigInt64LE()

      destroyInteractiveWindow()
      createInteractiveWindow(this._natmri_win.win!)
      this._register(toDisposable(() => {
        destroyInteractiveWindow()
      }))

      this.lifecycleMainService.onBeforeShutdown(() => {
        this.dispose()
      })
    }
    else {
      this._natmri_win.win?.setIgnoreMouseEvents(true, {
        forward: true,
      })
    }

    this._natmri_win.win?.on('close', (e) => {
      this.logService.info('[WallpaperPlayer] window will close...', e)
    })

    this._natmri_win.win?.on('ready-to-show', () => this._natmri_win.win?.show())
  }

  override dispose(): void {
    super.dispose()
    this._natmri_win?.close()
    this._natmri_win = null!
  }
}
