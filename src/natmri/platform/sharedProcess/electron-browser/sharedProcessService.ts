import { Barrier, timeout } from 'natmri/base/common/async'
import { Disposable } from 'natmri/base/common/lifecycle'
import { ILoggerService } from 'natmri/platform/log/common/log'
import { Client as MessagePortClient } from 'natmri/base/parts/ipc/common/ipc.mp'
import { mark } from 'natmri/base/common/performance'
import type { IChannel, IServerChannel } from 'natmri/base/parts/ipc/common/ipc'
import { getDelayedChannel } from 'natmri/base/parts/ipc/common/ipc'
import { acquirePort } from 'natmri/base/parts/ipc/electron-sandbox/ipc.mp'

export class SharedProcessService extends Disposable {
  declare readonly _serviceBrand: undefined

  private readonly withSharedProcessConnection: Promise<MessagePortClient>

  private readonly restoredBarrier = new Barrier()

  constructor(
    @ILoggerService private readonly logService: ILoggerService,
  ) {
    super()

    this.withSharedProcessConnection = this.connect()
  }

  private async connect(): Promise<MessagePortClient> {
    this.logService.trace('Renderer->SharedProcess#connect')

    // Our performance tests show that a connection to the shared
    // process can have significant overhead to the startup time
    // of the window because the shared process could be created
    // as a result. As such, make sure we await the `Restored`
    // phase before making a connection attempt, but also add a
    // timeout to be safe against possible deadlocks.

    await Promise.race([this.restoredBarrier.wait(), timeout(2000)])

    // Acquire a message port connected to the shared process
    mark('code/willConnectSharedProcess')
    this.logService.trace('Renderer->SharedProcess#connect: before acquirePort')
    const port = await acquirePort('natmri:createSharedProcessMessageChannel', 'natmri:createSharedProcessMessageChannelResult')
    mark('code/didConnectSharedProcess')
    this.logService.trace('Renderer->SharedProcess#connect: connection established')

    return this._register(new MessagePortClient(port, 'window: 0'))
  }

  notifyRestored(): void {
    if (!this.restoredBarrier.isOpen())
      this.restoredBarrier.open()
  }

  getChannel(channelName: string): IChannel {
    return getDelayedChannel(this.withSharedProcessConnection.then(connection => connection.getChannel(channelName)))
  }

  registerChannel(channelName: string, channel: IServerChannel<string>): void {
    this.withSharedProcessConnection.then(connection => connection.registerChannel(channelName, channel))
  }
}
