import { join } from 'path'
import { createDecorator } from '@livemoe/core'
import { Disposable } from '@livemoe/utils'
import { protocol } from 'electron'
import fs from 'fs-extra'
import { Schemas } from 'natmri/base/common/network'
import { URI } from 'natmri/base/common/uri'
import { getMediaOrTextMime } from 'natmri/base/common/mime'
import { ILoggerService } from './log'
import { INativeEnvironmentService } from './environment'

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
          callback(fs.createReadStream(join(this.nativeEnvironment.resourcePath, 'resources', uri.fsPath)))
          break
        case 'page':
          {
            const filepath = join(__dirname, uri.fsPath)
            callback({
              data: fs.createReadStream(filepath),
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
