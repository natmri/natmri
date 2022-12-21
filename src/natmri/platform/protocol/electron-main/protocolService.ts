import { createReadStream } from 'fs'
import { protocol } from 'electron'
import { createDecorator } from 'natmri/base/common/instantiation'
import { Disposable } from 'natmri/base/common/lifecycle'
import { getMediaOrTextMime } from 'natmri/base/common/mime'
import { Schemas } from 'natmri/base/common/network'
import { join } from 'natmri/base/common/path'
import { URI } from 'natmri/base/common/uri'
import { INativeEnvironmentService } from 'natmri/platform/environment/common/environment'
import { ILoggerService } from 'natmri/platform/log/common/log'

export interface IProtocolService {

}

export const IProtocolService = createDecorator<IProtocolService>('IProtocolService')

export class ProtocolService extends Disposable implements IProtocolService {
  constructor(
    @INativeEnvironmentService private readonly nativeEnvironment: INativeEnvironmentService,
    @ILoggerService private readonly logService: ILoggerService,
  ) {
    super()

    this.handleProtocols()
    this.logService.info('[ProtocolService] initial')
  }

  handleProtocols() {
    protocol.registerStreamProtocol(Schemas.natmri, (request, callback) => {
      const uri = URI.parse(request.url)

      switch (uri.authority) {
        case 'assets':
          callback(createReadStream(join(this.nativeEnvironment.resourcePath, 'resources', uri.fsPath)))
          break
        case 'page':
          {
            const filepath = join(__dirname, uri.fsPath)
            callback({
              data: createReadStream(filepath),
              mimeType: getMediaOrTextMime(filepath),
            })
          }
          break
        default:
          callback({})
      }
    })

    protocol.interceptFileProtocol('file', (request, callback) => {
      callback({})
    })
  }
}
