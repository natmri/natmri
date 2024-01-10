import { join } from 'node:path'
import { Tray as ElectronTray, nativeImage } from 'electron'
import { Disposable } from 'natmri/base/common/lifecycle'
import { INativeEnvironmentMainService } from 'natmri/platform/environment/electron-main/environmentMainService'
import { isWindows } from 'natmri/base/common/environment'
import { Emitter } from 'natmri/base/common/event'
import type { Event } from 'natmri/base/common/event'
import { INativeHostMainService } from 'natmri/platform/native/electron-main/nativeHostMainService'

export interface INativeNatmriTray {
  tray: ElectronTray | undefined
}

export class NatmriTray extends Disposable implements INativeNatmriTray {
  protected readonly _onDidTriggerSystemContextMenu = this._register(new Emitter<{ x: number, y: number }>())
  readonly onDidTriggerSystemContextMenu: Event<{ x: number, y: number }> = this._onDidTriggerSystemContextMenu.event

  protected readonly _onDidDestroy = this._register(new Emitter<void>())
  readonly onDidDestroy: Event<void> = this._onDidDestroy.event

  private _tray: ElectronTray
  get tray() { return this._tray }

  constructor(
    @INativeEnvironmentMainService private readonly nativeEnvironmentMainService: INativeEnvironmentMainService,
    @INativeHostMainService private readonly nativeHostMainService: INativeHostMainService,
  ) {
    super()
    this._tray = new ElectronTray(nativeImage.createFromPath(this.getNativeImagePath()))

    // this._tray.setContextMenu(Menu.buildFromTemplate([
    //   {
    //     label: 'quit',
    //     click: async () => {
    //       await this.nativeHostMainService.quit()
    //     },
    //   },
    // ]))

    this.registerListeners()
  }

  private registerListeners() {
    this._tray.on('right-click', (_event, { x, y }) => {
      this._onDidTriggerSystemContextMenu.fire({ x, y })
    })
  }

  private getNativeImagePath() {
    if (isWindows)
      return join(this.nativeEnvironmentMainService.resourcePath, 'icons', 'icon.ico')

    return join(this.nativeEnvironmentMainService.resourcePath, 'icons', 'icon.icns')
  }

  private destroy() {
    this._tray.destroy()
    this._onDidDestroy.fire()
  }

  override dispose(): void {
    super.dispose()
    this.destroy()
    this._tray = undefined!
  }
}
