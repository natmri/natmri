import { ipcRenderer } from 'electron'
import { BroadcastDataChannel } from 'natmri/base/browser/broadcast'
import { WALLPAPER_BROADCAST_CHANNEL } from 'natmri/base/common/constants'
import type { IWallpaperBroadcastClientData, IWallpaperInitialEventConfig } from 'typings/wallpaper'

let broadcast: WallpaperBroadcastServer
let video: HTMLVideoElement
let isVideo = false

class WallpaperBroadcastServer {
  private broadcast: BroadcastDataChannel<IWallpaperBroadcastClientData>
  private initial: IWallpaperInitialEventConfig

  constructor(private readonly channelName: string) {
    this.broadcast = new BroadcastDataChannel(this.channelName)
  }

  init(initial: IWallpaperInitialEventConfig) {
    this.initial = initial

    if (isVideo) {
      video.addEventListener('timeupdate', () => {
        if (Number.isNaN(video.duration)) // no-ready
          return
        broadcast.progress(video.currentTime, video.duration)
      })

      video.addEventListener('canplaythrough', () => {
        video.play()
      })
    }
    else {
      // mock send timeupdate event
    }
  }

  play() {

  }

  pause() {

  }

  progress(_: number, __: number) {

  }

  dispose() {
    this.broadcast.dispose()
  }
}

window.addEventListener('load', () => {
  video = <HTMLVideoElement | null>document.getElementById('__video_instance__')
  isVideo = !!video
  broadcast = new WallpaperBroadcastServer(WALLPAPER_BROADCAST_CHANNEL)

  ipcRenderer.once('init', (_, data: any) => broadcast.init(data))
  ipcRenderer.on('play', () => broadcast.play())
  ipcRenderer.on('pause', () => broadcast.pause())
  ipcRenderer.on('stop', () => broadcast.play())
  ipcRenderer.on('mute', () => broadcast.play())
  ipcRenderer.on('volume', () => broadcast.play())
  ipcRenderer.on('mode', () => broadcast.play())
})

window.addEventListener('beforeunload', () => {
  broadcast.dispose()
})
