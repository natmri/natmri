import type { IPlayerController, IPlayerLoader } from 'typings/player'
import type { IWallpaperPlayFile, IWallpaperPlayer } from 'typings/wallpaper'
import { Player } from './player'
import type { WallpaperPlayerUI } from './ui/wallpaper'

export class WallpaperPlayer extends Player<IWallpaperPlayFile> implements IWallpaperPlayer {
  loader: IPlayerLoader<IWallpaperPlayFile>
  controller: IPlayerController
  ui: WallpaperPlayerUI
}
