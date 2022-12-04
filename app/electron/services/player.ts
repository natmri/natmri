import { createDecorator } from '@livemoe/core'
import type { IRepository } from '@starter/shared'
import type { IPlayerController } from '~/core/player/player'

export interface IWallpaperPlayerService extends IPlayerController {
  getRepositories(): IRepository[]
}

export const IWallpaperPlayerService = createDecorator<IWallpaperPlayerService>('IWallpaperPlayerService')

export interface ILive2DPlayerService extends IPlayerController {
  getRepositories(): IRepository[]
}

export const ILive2DPlayerService = createDecorator<ILive2DPlayerService>('ILive2DPlayerService')
