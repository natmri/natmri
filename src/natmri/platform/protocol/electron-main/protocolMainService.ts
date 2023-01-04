import { createReadStream } from 'fs'
import { protocol, session } from 'electron'
import { createDecorator } from 'natmri/base/common/instantiation'
import { Disposable, toDisposable } from 'natmri/base/common/lifecycle'
import { getMediaOrTextMime } from 'natmri/base/common/mime'
import { Schemas } from 'natmri/base/common/network'
import { join } from 'natmri/base/common/path'
import { URI } from 'natmri/base/common/uri'
import { INativeEnvironmentService } from 'natmri/platform/environment/common/environment'
import { ILoggerService } from 'natmri/platform/log/common/log'

interface ProtocolCallback {
  (result: string | Electron.FilePathWithHeaders | { error: number }): void
}

export interface IProtocolMainService {

}

export const IProtocolMainService = createDecorator<IProtocolMainService>('protocolMainService')

export class ProtocolMainService extends Disposable implements IProtocolMainService {
  constructor(
    @INativeEnvironmentService private readonly nativeEnvironment: INativeEnvironmentService,
    @ILoggerService private readonly logService: ILoggerService,
  ) {
    super()

    this.configurationSession()
    this.handleProtocols()
  }

  private handleProtocols() {
    protocol.registerStreamProtocol(Schemas.natmri, (request, callback) => this.handleNatmriRequest(request, callback))

    // intercept file://
    protocol.interceptFileProtocol('file', (request, callback) => this.handleFileRequest(request, callback))

    // Cleanup
    this._register(toDisposable(() => {
      protocol.uninterceptProtocol(Schemas.file)
    }))
  }

  private configurationSession() {
    session.defaultSession.setPreloads([
      join(this.nativeEnvironment.preloadPath, 'natmri/base/parts/preload/globals.js'),
    ])
  }

  // #region natmri://
  private handleNatmriRequest(request: Electron.ProtocolRequest, callback: (response: NodeJS.ReadableStream | Electron.ProtocolResponse) => void) {
    const uri = URI.parse(request.url)

    switch (uri.authority) {
      case 'assets':
        callback(createReadStream(join(this.nativeEnvironment.resourcePath, 'resources', uri.fsPath)))
        break
      case 'page':
        {
          const fsPath: string = join(__dirname, uri.fsPath)
          callback({
            data: createReadStream(fsPath),
            mimeType: getMediaOrTextMime(fsPath),
          })
        }

        break
      default:
        callback({})
    }
  }

  // #endregion

  // #region file://

  private handleFileRequest(request: Electron.ProtocolRequest, callback: ProtocolCallback) {
    const uri = URI.parse(request.url)

    this.logService.error(`Refused to load resource ${uri.fsPath} from ${Schemas.file}: protocol (original URL: ${request.url})`)

    return callback({ error: -3 /* ABORTED */ })
  }

  // #endregion
}
