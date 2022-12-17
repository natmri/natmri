import { join } from 'path'
import { createDecorator } from '@livemoe/core'
import { Disposable } from '@livemoe/utils'
import { dev, macOS, windows } from 'eevi-is'
import type { IRepository } from 'typings/repository'
import { ILoggerService } from './log'

export interface INativeEnvironmentService {
  resourcePath: string
  repositores: IRepository[]
  platformIconPath: string
  preloadPath: string
}

export const INativeEnvironmentService = createDecorator<INativeEnvironmentService>('INativeEnvironmentService')

export class NativeEnvironmentService extends Disposable implements INativeEnvironmentService {
  constructor(
    @ILoggerService private readonly logService: ILoggerService,
  ) {
    super()

    this.logService.info('[NativeEnvironmentService] initial')
  }

  get resourcePath() {
    return dev() ? process.cwd() : process.resourcesPath
  }

  get repositores() {
    return []
  }

  get platformIconPath() {
    if (windows())
      return join(this.resourcePath, 'assets', 'icons', 'icon.ico')
    if (macOS())
      return join(this.resourcePath, 'assets', 'icons', '32x32.png')

    return join(this.resourcePath, 'assets', 'icons', '32x32.png')
  }

  get preloadPath() {
    return join(__dirname, 'preload')
  }
}
