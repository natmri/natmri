import { Disposable, Emitter, toDisposable } from '@livemoe/utils'

export class BroadcastDataChannel<T> extends Disposable {
  private broadcastChannel: BroadcastChannel | undefined

  private readonly _onDidReceiveData = this._register(new Emitter<T>())
  readonly onDidReceiveData = this._onDidReceiveData.event

  constructor(private readonly channelName: string) {
    super()

    // Use BroadcastChannel
    this.broadcastChannel = new BroadcastChannel(channelName)
    const listener = (event: MessageEvent) => {
      this._onDidReceiveData.fire(event.data)
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
  postData(data: T): void {
    if (this.broadcastChannel) {
      this.broadcastChannel.postMessage(data)
    }
    else {
      // remove previous changes so that event is triggered even if new changes are same as old changes
      window.localStorage.removeItem(this.channelName)
      window.localStorage.setItem(this.channelName, JSON.stringify(data))
    }
  }
}
