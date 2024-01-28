import { Disposable } from 'natmri/base/common/lifecycle'
import { IWindowsMainService } from 'natmri/platform/windows/electron-main/windows'
import { INativeEnvironmentMainService } from 'natmri/platform/environment/electron-main/environmentMainService'
import { ILoggerService } from 'natmri/platform/log/common/log'
import { ILifecycleMainService } from 'natmri/platform/lifecycle/electron-main/lifecycleMainService'
import type { INatmriWindow } from 'natmri/platform/window/electron-main/window'
import { URI } from 'natmri/base/common/uri'
import { INativeHostMainService } from 'natmri/platform/native/electron-main/nativeHostMainService'

export class WallpaperStore extends Disposable {
  private _natmri_win: INatmriWindow = null!

  constructor(
    @ILoggerService private readonly logService: ILoggerService,
    @IWindowsMainService private readonly windowsMainService: IWindowsMainService,
    @INativeEnvironmentMainService private readonly environmentMainService: INativeEnvironmentMainService,
    @ILifecycleMainService private readonly lifecycleMainService: ILifecycleMainService,
    @INativeHostMainService private readonly nativeHostMainService: INativeHostMainService,
  ) {
    super()

    this._natmri_win = this.windowsMainService.getWindow({
      show: true,
      title: 'Wallpaper - Store', // default title
      titleBarStyle: 'native',
      skipTaskbar: true,
      center: true,
      width: 1280,
      height: 768,
      minWidth: 1280,
      minHeight: 768,
      transparent: false,
      hasShadow: false,
      closable: true,
      focusable: true,
      fullscreenable: true,
      resizable: true,
      roundedCorners: false,
      thickFrame: false,
      autoHideMenuBar: true,
      webPreferences: {
        spellcheck: false,
        enableWebSQL: false,
        defaultEncoding: 'utf8',
        experimentalFeatures: true,
        disableHtmlFullscreenWindowResize: true,
        scrollBounce: true,
        sandbox: false,
      },
    })

    this._natmri_win.win?.setMenu(null)
    this._natmri_win.win?.on('close', (e) => {
      this.logService.info('[WallpaperPlayer] window will close...', e)
    })

    this._natmri_win.win?.on('ready-to-show', () => {
      this._natmri_win.win?.webContents.openDevTools({ mode: 'detach' })
      this._natmri_win.win?.show()
    })

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
    super.dispose()
    this._natmri_win.win?.destroy()
    this._natmri_win = null!
  }
}
