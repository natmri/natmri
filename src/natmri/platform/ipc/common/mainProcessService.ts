import { createDecorator } from 'natmri/base/common/instantiation'
import type { IChannel, IPCServer, IServerChannel, StaticRouter } from 'natmri/base/parts/ipc/common/ipc'

export const IMainProcessService = createDecorator<IMainProcessService>('mainProcessService')

export interface IMainProcessService { }

/**
 * An implementation of `IMainProcessService` that leverages `IPCServer`.
 */
export class MainProcessService implements IMainProcessService {
  declare readonly _serviceBrand: undefined

  constructor(
    private server: IPCServer,
    private router: StaticRouter,
  ) { }

  getChannel(channelName: string): IChannel {
    return this.server.getChannel(channelName, this.router)
  }

  registerChannel(channelName: string, channel: IServerChannel<string>): void {
    this.server.registerChannel(channelName, channel)
  }
}
