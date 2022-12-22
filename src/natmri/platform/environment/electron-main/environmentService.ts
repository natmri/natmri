import { join } from 'path'
import { ILoggerService } from 'natmri/platform/log/common/log'
import { URI } from 'natmri/base/common/uri'
import type { INativeEnvironmentService, NativeParsedArgs } from 'natmri/platform/environment/common/environment'
import minimist from 'minimist'
import { isDevelopment, isMacintosh, isWindows } from 'natmri/base/common/environment'
import { Disposable } from 'natmri/base/common/lifecycle'

export class NativeEnvironmentService extends Disposable implements INativeEnvironmentService {
  readonly args: NativeParsedArgs = minimist(process.argv.slice(2)) as NativeParsedArgs

  constructor(
    @ILoggerService private readonly logService: ILoggerService,
  ) {
    super()

    this.logService.info('[NativeEnvironmentService] initial')
  }

  get isMpaMode() {
    return process.env.MODE === 'mpa'
  }

  get resourcePath() {
    return isDevelopment ? process.cwd() : process.resourcesPath
  }

  get repositores() {
    return []
  }

  get platformIconPath() {
    if (isWindows)
      return join(this.resourcePath, 'resources', 'icons', 'icon.ico')
    if (isMacintosh)
      return join(this.resourcePath, 'resources', 'icons', '32x32.png')

    return join(this.resourcePath, 'resources', 'icons', '32x32.png')
  }

  get preloadPath() {
    return join(__dirname, 'preload')
  }

  /**
   * Default path: /src/{@link pagepath pagepath}
   */
  getPagesPath(pagepath: string): string {
    console.log(URI.file(join(__dirname, pagepath)).toString())

    return isDevelopment ? new URL(pagepath, process.env.URL).toString() : URI.file(join(__dirname, pagepath)).toString()
  }
}
