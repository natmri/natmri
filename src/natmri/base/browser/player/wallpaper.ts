import { Disposable, Emitter } from '@livemoe/utils'
import { WALLPAPER_BROADCAST_CHANNEL } from 'natmri/base/common/constants'
import type { IWallpaperBroadcastClientData, IWallpaperBroadcastServerData } from 'typings/wallpaper'
import { BroadcastDataChannel } from '../broadcast'

export class WallpaperBroadcastClient extends Disposable {
  private readonly $broadcast: BroadcastDataChannel<IWallpaperBroadcastClientData, IWallpaperBroadcastServerData>

  private readonly $onPlay = this._register(new Emitter<void>())
  private readonly $onPause = this._register(new Emitter<void>())
  private readonly $onProgress = this._register(new Emitter<void>())
  private readonly $onVolume = this._register(new Emitter<void>())

  readonly onPlay = this.$onPlay.event
  readonly onPause = this.$onPause.event
  readonly onProgress = this.$onProgress.event
  readonly onVolume = this.$onVolume.event

  constructor(private readonly channelName: string = WALLPAPER_BROADCAST_CHANNEL) {
    super()
    this.$broadcast = this._register(new BroadcastDataChannel(this.channelName))
    this.$broadcast.onDidReceiveData(e => this.onReceiveData(e))
  }

  private onReceiveData(data: IWallpaperBroadcastClientData) {
    switch (data.kind) {
      default:
        break
    }
  }

  postData(data: IWallpaperBroadcastServerData) {
    this.$broadcast.postData(data)
  }
}
