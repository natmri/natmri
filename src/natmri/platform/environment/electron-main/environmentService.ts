import { join } from 'path'
import { Disposable } from '@livemoe/utils'
import { dev, macOS, windows } from 'eevi-is'
import { ILoggerService } from 'natmri/platform/log/common/log'
import { URI } from 'natmri/base/common/uri'
import type { INativeEnvironmentService, NativeParsedArgs } from 'natmri/platform/environment/common/environment'
import minimist from 'minimist'

export class NativeEnvironmentService extends Disposable implements INativeEnvironmentService {
  readonly args: NativeParsedArgs = minimist(process.argv.slice(2)) as NativeParsedArgs

  constructor(
    @ILoggerService private readonly logService: ILoggerService,
  ) {
    super()

    this.logService.info('[NativeEnvironmentService] initial', this.args)
  }

  get isMpaMode() {
    return process.env.MODE === 'mpa'
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

  /**
   * Default path: /src/${@link pagepath}
   */
  getPagesPath(pagepath: string): string {
    console.log(URI.file(join(__dirname, pagepath)).toString())

    return dev() ? new URL(pagepath, process.env.URL).toString() : URI.file(join(__dirname, pagepath)).toString()
  }
}
