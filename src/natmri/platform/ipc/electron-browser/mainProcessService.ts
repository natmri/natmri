import { Disposable } from 'natmri/base/common/lifecycle'
import { createDecorator } from 'natmri/base/common/instantiation'
import { NATMRI_CHANNEL } from 'natmri/platform/ipc/common/services'
import { Client as IPCElectronClient } from 'natmri//base/parts/ipc/electron-browser/ipc.electron'
import type { IChannel, IServerChannel } from 'natmri/base/parts/ipc/common/ipc'

export interface IMainProcessService {
  readonly _serviceBrand: undefined

  getChannel(channelName: string): IChannel
  registerChannel(channelName: string, channel: IServerChannel<string>): void
}

export const IMainProcessService = createDecorator<IMainProcessService>('mainProcessService')

export class MainProcessService extends Disposable implements IMainProcessService {
  readonly _serviceBrand: undefined

  private mainProcessConnection: IPCElectronClient

  constructor() {
    super()

    this.mainProcessConnection = this._register(new IPCElectronClient(NATMRI_CHANNEL))
  }

  getChannel(channelName: string): IChannel {
    return this.mainProcessConnection.getChannel(channelName)
  }

  registerChannel(channelName: string, channel: IServerChannel<string>): void {
    this.mainProcessConnection.registerChannel(channelName, channel)
  }
}
