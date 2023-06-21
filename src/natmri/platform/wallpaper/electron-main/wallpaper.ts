import { join } from 'node:path'
import { createInteractiveWindow, destroyInteractiveWindow } from '@natmri/platform'
import { Disposable, toDisposable } from 'natmri/base/common/lifecycle'
import { IWindowsMainService } from 'natmri/platform/windows/electron-main/windows'
import { isWindows } from 'natmri/base/common/environment'
import { INativeEnvironmentMainService } from 'natmri/platform/environment/electron-main/environmentMainService'
import { ILoggerService } from 'natmri/platform/log/common/log'
import { ILifecycleMainService } from 'natmri/platform/lifecycle/electron-main/lifecycleMainService'
import type { INatmriWindow } from 'natmri/platform/window/electron-main/window'
import { URI } from 'natmri/base/common/uri'
import { INativeHostMainService } from 'natmri/platform/native/electron-main/nativeHostMainService'
import { screen } from 'electron'

export class WallpaperPlayer extends Disposable {
  private _natmri_win: INatmriWindow = null!
  private display = screen.getPrimaryDisplay()

  constructor(
    @ILoggerService private readonly logService: ILoggerService,
    @IWindowsMainService private readonly windowsMainService: IWindowsMainService,
    @INativeEnvironmentMainService private readonly environmentMainService: INativeEnvironmentMainService,
    @ILifecycleMainService private readonly lifecycleMainService: ILifecycleMainService,
    @INativeHostMainService private readonly nativeHostMainService: INativeHostMainService,
  ) {
    super()

    this._natmri_win = this.windowsMainService.getWindow({
      show: false,
      title: 'Wallpaper - Engine', // default title
      titleBarStyle: 'native',
      skipTaskbar: true,
      x: this.display.workArea.x,
      y: this.display.workArea.y,
      width: this.display.size.width,
      height: this.display.size.height,
      minWidth: this.display.size.width,
      minHeight: this.display.size.height,
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

    this._natmri_win.win?.setSkipTaskbar(true)

    if (isWindows) {
      // windows shutdown lock window
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
      this.lifecycleMainService.onBeforeShutdown(() => {
        this.dispose()
      })
    }

    this._natmri_win.win?.setMenu(null)

    this._natmri_win.win?.on('close', (e) => {
      this.logService.info('[WallpaperPlayer] window will close...', e)
    })

    this._natmri_win.win?.on('ready-to-show', () => this._natmri_win.win?.show())

    this.registerListener()
  }

  private registerListener() {
    // Event.filter(this.nativeHostMainService.onDidChangeDisplay,
    //   e => Array.isArray(e) && (e.includes('workArea') || e.includes('workAreaSize') || e.includes('scaleFactor')))
    // ((e) => {

    // })
  }

  load(p: string) {
    const uri = URI.parse(p)
    this._natmri_win.loadURL(uri)
  }

  override dispose(): void {
    console.log('WallpaperPlayer::dispose')

    super.dispose()
    this._natmri_win.win?.destroy()
    this._natmri_win = null!
  }
}
