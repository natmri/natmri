import { Disposable } from 'natmri/base/common/lifecycle'
import { ProxyChannel } from 'natmri/base/parts/ipc/common/ipc'
import { IMainProcessService } from 'natmri/platform/ipc/electron-browser/mainProcessService'
import type { INativeHostService } from 'natmri/platform/native/electron-browser/native'

// @ts-expect-error: interface is implemented via proxy
export class NativeHostService extends Disposable implements INativeHostService {
  constructor(
      @IMainProcessService private readonly mainProcessService: IMainProcessService,
  ) {
    super()

    // @ts-expect-error: interface is implemented via proxy
    return ProxyChannel.toService<INativeHostService>(
      this.mainProcessService.getChannel('nativeHost'),
    )
  }
}
