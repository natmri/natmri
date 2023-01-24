import { createDecorator } from 'natmri/base/common/instantiation'
import { Disposable } from 'natmri/base/common/lifecycle'
import { INativeEnvironmentService } from 'natmri/platform/environment/common/environment'
import { ILifecycleMainService } from 'natmri/platform/lifecycle/electron-main/lifecycleMainService'
import { ILoggerService } from 'natmri/platform/log/common/log'
import type { ITrayService } from 'natmri/platform/tray/common/tray'
import type { NatmriTray } from 'natmri/platform/tray/electron-main/tray'

export interface INativeTrayMainService extends ITrayService {
}

export const INativeTrayMainService = createDecorator<INativeTrayMainService>('nativeTrayMainService')

export class NativeTrayMainService extends Disposable implements INativeTrayMainService {
  declare readonly _serviceBrand: undefined

  constructor(
    private readonly tray: NatmriTray,
    @INativeEnvironmentService private readonly nativeEnvironemt: INativeEnvironmentService,
    @ILoggerService private readonly logService: ILoggerService,
    @ILifecycleMainService private readonly lifecycleService: ILifecycleMainService,
  ) {
    super()
    this._register(this.tray)
  }
}
