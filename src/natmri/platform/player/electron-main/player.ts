import { Disposable, Emitter, Event } from '@livemoe/utils'
import { BrowserView, BrowserWindow } from 'electron'
import { isDevelopment } from 'natmri/base/common/environment'
import type { IPlayerUI, PlayerErrorEvent } from 'typings/player'

export class PlayerUIView extends Disposable {
  private $view: BrowserView
  private $ready = false
  private $onReady = this._register(new Emitter<void>())
  private $onError = this._register(new Emitter<PlayerErrorEvent>())

  readonly onError = this.$onError.event

  constructor(bounds: Electron.Rectangle) {
    super()
    this.$view = new BrowserView({
      webPreferences: {
        safeDialogs: true,
        nodeIntegration: false,
        nodeIntegrationInWorker: false,
        nodeIntegrationInSubFrames: false,
        backgroundThrottling: false,
        webviewTag: false,
        contextIsolation: true,
        spellcheck: false,
        enableWebSQL: false,
        devTools: isDevelopment,
        experimentalFeatures: true,
        // preload: resolvePreload('wallpaper'),
      },
    })
    this.$view.setBounds(bounds)
    this.$view.setBackgroundColor('#00000000')
    this.$view.setAutoResize({
      width: true,
      height: true,
      vertical: true,
      horizontal: true,
    })

    this.registerListener()
  }

  get id() {
    return this.$view.webContents.id
  }

  whenReady() {
    if (this.$ready)
      return Promise.resolve()

    return Event.toPromise(this.$onReady.event)
  }

  private registerListener() {
    this.$view.webContents.on('did-start-loading', () => this.$ready = false)
    this.$view.webContents.on('did-finish-load', () => this.$onReady.fire())
    this.$view.webContents.on('did-fail-load', (_, code, description, url) => this.$onError.fire({ code, description, url }))
  }
}

export abstract class PlayerUI extends Disposable implements IPlayerUI {
  private $window: BrowserWindow
  private $views: PlayerUIView[]

  readonly hWnd: number

  constructor() {
    super()
    this.$window = new BrowserWindow({
      title: 'LiveMoe - WallpaperEngine',
      x: 0,
      y: 0,
      width: 1920,
      height: 1080,
      minHeight: 1080,
      minWidth: 1920,
      maxHeight: 1080,
      maxWidth: 1920,
      center: true,
      closable: false,
      show: false,
      skipTaskbar: true,
      movable: false,
      transparent: true,
      backgroundColor: '#00000000',
      autoHideMenuBar: true,
      hasShadow: false,
      frame: false,
      fullscreen: true,
      resizable: false,
      type: 'desktop',
    })
    this.$views = [
      this._register(new PlayerUIView(this.$window.getBounds())),
      this._register(new PlayerUIView(this.$window.getBounds())),
    ]

    this.hWnd = Number(this.$window.getNativeWindowHandle().readBigInt64LE())
    this.$window.setMenu(null)
    this.$window.setIgnoreMouseEvents(true, {
      forward: true,
    })
  }
}
