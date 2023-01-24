import { join } from 'node:path'
import { Tray as ElectronTray, Menu, app, nativeImage } from 'electron'
import { Disposable } from 'natmri/base/common/lifecycle'
import { INativeEnvironmentMainService } from 'natmri/platform/environment/electron-main/environmentMainService'
import { isMacintosh, isWindows } from 'natmri/base/common/environment'
import { ILifecycleMainService } from 'natmri/platform/lifecycle/electron-main/lifecycleMainService'
import { Emitter } from 'natmri/base/common/event'
import type { Event } from 'natmri/base/common/event'

export interface INativeNatmriTray {
  tray: ElectronTray | undefined
}

export class NatmriTray extends Disposable implements INativeNatmriTray {
  protected readonly _onDidTriggerSystemContextMenu = this._register(new Emitter<{ x: number; y: number }>())
  readonly onDidTriggerSystemContextMenu: Event<{ x: number; y: number }> = this._onDidTriggerSystemContextMenu.event

  protected readonly _onDidDestroy = this._register(new Emitter<void>())
  readonly onDidDestroy: Event<void> = this._onDidDestroy.event

  private _tray: ElectronTray
  get tray() { return this._tray }

  constructor(
    @INativeEnvironmentMainService private readonly nativeEnvironmentMainService: INativeEnvironmentMainService,
    @ILifecycleMainService private readonly lifecycleMainService: ILifecycleMainService,
  ) {
    super()
    this._tray = new ElectronTray(nativeImage.createFromPath(this.getNativeImagePath()))

    this._tray.setContextMenu(Menu.buildFromTemplate([
      {
        label: 'quit',
        click: async () => {
          await this.lifecycleMainService.quit()
        },
      },
    ]))

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
    if (isMacintosh)
      return join(this.nativeEnvironmentMainService.resourcePath, 'icons', '32x32.png')

    return join(this.nativeEnvironmentMainService.resourcePath, 'icons', '32x32.png')
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
