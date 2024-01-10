import process from 'node:process'
import { ipcRenderer } from 'natmri/base/common/globals'
import { Disposable } from 'natmri/base/common/lifecycle'
import { Server as MessagePortServer } from 'natmri/base/parts/ipc/electron-browser/ipc.mp'
import { ProxyChannel, StaticRouter } from 'natmri/base/parts/ipc/common/ipc'
import { InstantiationService, ServiceCollection, SyncDescriptor } from 'natmri/base/common/instantiation'
import { ILoggerService } from 'natmri/platform/log/common/log'
import { LoggerService } from 'natmri/platform/log/browser/logService'
import { IMainProcessService, MainProcessService } from 'natmri/platform/ipc/common/mainProcessService'
import { INativeHostService } from 'natmri/platform/native/electron-browser/native'
import { onUnexpectedError, setUnexpectedErrorHandler, toErrorMessage } from 'natmri/base/common/errors'
import type { IInstantiationService, ServicesAccessor } from 'natmri/base/common/instantiation'
import type { IPCServer } from 'natmri/base/parts/ipc/common/ipc'

class SharedProcess extends Disposable {
  private readonly server: IPCServer = this._register(new MessagePortServer())

  constructor() {
    super()

    this.registerListeners()
  }

  private registerListeners() {
    // Shared process lifecycle
    let didExit = false
    const onExit = () => {
      if (!didExit) {
        didExit = true

        this.dispose()
      }
    }

    process.once('exit', onExit)
    ipcRenderer.once('natmri:electron-main->shared-process=exit', onExit)
  }

  async initialize() {
    const mainInstantionService = await this.initServices()

    mainInstantionService.invokeFunction((accessor) => {
      const logService = accessor.get(ILoggerService)

      // Channels
      this.initChannels(accessor)

      // Error handlers
      this.registerErrorHandler(logService)
    })
  }

  private async initServices(): Promise<IInstantiationService> {
    const services = new ServiceCollection()

    // main process
    const mainRouter = new StaticRouter(ctx => ctx === 'main')
    const mainProcessService = new MainProcessService(
      this.server,
      mainRouter,
    )
    services.set(IMainProcessService, mainProcessService)

    // logger
    services.set(ILoggerService, new SyncDescriptor(LoggerService))

    // Native Host
    const nativeHostService = ProxyChannel.toService<INativeHostService>(mainProcessService.getChannel('nativeHost'))
    services.set(INativeHostService, nativeHostService)

    return new InstantiationService(services)
  }

  private initChannels(accessor: ServicesAccessor) {

  }

  private registerErrorHandler(logService: ILoggerService): void {
    window.addEventListener('unhandledrejection', (event: any) => {
      // See https://developer.mozilla.org/en-US/docs/Web/API/PromiseRejectionEvent
      onUnexpectedError(event.reason)

      // Prevent the printing of this event to the console
      event.preventDefault()
    })

    // Install handler for unexpected errors
    setUnexpectedErrorHandler((error) => {
      const message = toErrorMessage(error, true)
      if (!message)
        return

      logService.error(`[uncaught exception in sharedProcess]: ${message}`)
    })
  }
}

async function main() {
  const sharedProcess = new SharedProcess()

  ipcRenderer.send('natmri:shared-process->electron-main=ipc-ready')

  await sharedProcess.initialize()

  ipcRenderer.send('natmri:shared-process->electron-main=init-done')
}

await main()
