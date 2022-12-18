import { createDecorator } from '@livemoe/core'
import { Disposable } from '@livemoe/utils'
import { Menu, Tray, app, nativeImage } from 'electron'
import { INativeEnvironmentService } from 'natmri/platform/environment/electron-main/environmentService'
import { ILifecycleService } from 'natmri/platform/lifecycle/electron-main/lifecycleService'
import { ILoggerService } from 'natmri/platform/log/common/log'

export interface INativeTrayService {
  title: string /** MacOS only */
  tooltip: string
}

export const INativeTrayService = createDecorator<INativeTrayService>('ITrayService')

export class NativeTrayService extends Disposable implements INativeTrayService {
  private $tray: Tray
  private $tooltip = ''

  constructor(
    @INativeEnvironmentService private readonly nativeEnvironemt: INativeEnvironmentService,
    @ILoggerService private readonly logService: ILoggerService,
    @ILifecycleService private readonly lifecycleService: ILifecycleService,
  ) {
    super()
    this.$tray = new Tray(nativeImage.createFromPath(this.nativeEnvironemt.platformIconPath))

    this.$tray.setContextMenu(Menu.buildFromTemplate([
      {
        label: 'quit',
        click: () => app.quit(),
      },
    ]))

    this.logService.info('[TrayService] initial')
  }

  set title(v: string) {
    this.$tray.setTitle(v)
  }

  get title() {
    return this.$tray.getTitle()
  }

  set tooltip(v: string) {
    this.$tooltip = v
    this.$tray.setToolTip(v)
  }

  get tooltip() {
    return this.$tooltip
  }
}
