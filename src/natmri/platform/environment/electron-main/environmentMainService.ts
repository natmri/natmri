import { join } from 'path'
import { URI } from 'natmri/base/common/uri'
import { isDevelopment, isMacintosh, isWindows } from 'natmri/base/common/environment'
import { Disposable } from 'natmri/base/common/lifecycle'
import { minimist } from 'natmri/base/node/minimist'
import { memoize } from 'natmri/base/common/decorators'
import { Schemas } from 'natmri/base/common/network'
import { createDecorator } from 'natmri/base/common/instantiation'
import type { INativeEnvironmentService, NativeParsedArgs } from 'natmri/platform/environment/common/environment'

export interface INativeEnvironmentMainService extends INativeEnvironmentService {}

export const INativeEnvironmentMainService = createDecorator<INativeEnvironmentMainService>('nativeEnvironmentMainService')

export class NativeEnvironmentMainService extends Disposable implements INativeEnvironmentService {
  declare readonly _serviceBrand: undefined

  constructor(
    readonly args: NativeParsedArgs = minimist(process.argv.slice(2)) as NativeParsedArgs,
  ) {
    super()
  }

  @memoize
  get appRoot() {
    return isDevelopment ? process.cwd() : process.resourcesPath
  }

  @memoize
  get resourcePath() {
    return join(this.appRoot, 'assets')
  }

  @memoize
  get preloadPath() {
    return join(__dirname)
  }

  getPageURI(path: string): URI {
    return isDevelopment
      ? URI.parse(new URL(path, process.env.URL).toString())
      : URI.parse(`${Schemas.natmri}://page/${path}`)
  }
}
