import { createDecorator } from '@livemoe/core'
import type { IRepository } from 'typings/repository'
import type { IPlayerController } from 'typings/player'
import { Disposable } from '@livemoe/utils'

export interface IWallpaperPlayerService extends IPlayerController {
  getRepositories(): IRepository[]
}

export const IWallpaperPlayerService = createDecorator<IWallpaperPlayerService>('IWallpaperPlayerService')

export interface ILive2DPlayerService extends IPlayerController {
  getRepositories(): IRepository[]
}

export const ILive2DPlayerService = createDecorator<ILive2DPlayerService>('ILive2DPlayerService')

export class WallpaperPlayerService extends Disposable implements IWallpaperPlayerService {
  getRepositories(): IRepository[] {
    throw new Error('Method not implemented.')
  }

  play(): void {
    throw new Error('Method not implemented.')
  }

  pause(): void {
    throw new Error('Method not implemented.')
  }
}

export class Live2DPlayerService implements ILive2DPlayerService {
  getRepositories(): IRepository[] {
    throw new Error('Method not implemented.')
  }

  play(): void {
    throw new Error('Method not implemented.')
  }

  pause(): void {
    throw new Error('Method not implemented.')
  }
}
