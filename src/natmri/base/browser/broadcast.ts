import { Emitter } from 'natmri/base/common/event'
import { Disposable, toDisposable } from 'natmri/base/common/lifecycle'

export class BroadcastDataChannel<T, TT = T> extends Disposable {
  private broadcastChannel: BroadcastChannel

  private readonly $onDidReceiveData = this._register(new Emitter<T>())
  readonly onDidReceiveData = this.$onDidReceiveData.event

  constructor(readonly channelName: string) {
    super()

    this.broadcastChannel = new BroadcastChannel(channelName)
    const listener = (event: MessageEvent) => {
      this.$onDidReceiveData.fire(event.data)
    }
    this.broadcastChannel.addEventListener('message', listener)
    this._register(toDisposable(() => {
      if (this.broadcastChannel) {
        this.broadcastChannel.removeEventListener('message', listener)
        this.broadcastChannel.close()
      }
    }))
  }

  /**
   * Sends the data to other BroadcastChannel objects set up for this channel. Data can be structured objects, e.g. nested objects and arrays.
   * @param data data to broadcast
   */
  postData(data: TT): void {
    this.broadcastChannel.postMessage(data)
  }
}
