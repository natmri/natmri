import { join } from 'path'
import { ILoggerService } from 'natmri/platform/log/common/log'
import { URI } from 'natmri/base/common/uri'
import type { INativeEnvironmentService, NativeParsedArgs } from 'natmri/platform/environment/common/environment'
import { isDevelopment, isMacintosh, isWindows } from 'natmri/base/common/environment'
import { Disposable } from 'natmri/base/common/lifecycle'
import { minimist } from 'natmri/base/node/minimist'
import { memoize } from 'natmri/base/common/decorators'
import { Schemas } from 'natmri/base/common/network'

export class NativeEnvironmentService extends Disposable implements INativeEnvironmentService {
  readonly args: NativeParsedArgs = minimist(process.argv.slice(2)) as NativeParsedArgs

  constructor(
    @ILoggerService private readonly logService: ILoggerService,
  ) {
    super()

    this.logService.info('[NativeEnvironmentService] initial')
  }

  @memoize
  get resourcePath() {
    return isDevelopment ? process.cwd() : process.resourcesPath
  }

  @memoize
  get repositores() {
    return []
  }

  @memoize
  get platformIconPath() {
    if (isWindows)
      return join(this.resourcePath, 'resources', 'icons', 'icon.ico')
    if (isMacintosh)
      return join(this.resourcePath, 'resources', 'icons', '32x32.png')

    return join(this.resourcePath, 'resources', 'icons', '32x32.png')
  }

  @memoize
  get preloadPath() {
    return join(__dirname, 'preload')
  }

  getPagesPath(pagepath: string): string {
    return isDevelopment
      ? new URL(pagepath, process.env.URL).toString()
      : URI.parse(`${Schemas.natmri}://page/${pagepath}`).toString()
  }
}
