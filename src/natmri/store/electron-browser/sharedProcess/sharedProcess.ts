import { ipcRenderer } from 'natmri/base/common/globals'
import { Disposable } from 'natmri/base/common/lifecycle'
import { Server as MessagePortServer } from 'natmri/base/parts/ipc/electron-browser/ipc.mp'
import { StaticRouter } from 'natmri/base/parts/ipc/common/ipc'
import { InstantiationService, ServiceCollection, SyncDescriptor } from 'natmri/base/common/instantiation'
import { ILoggerService } from 'natmri/platform/log/common/log'
import { LoggerService } from 'natmri/platform/log/browser/logService'
import { IMainProcessService, MainProcessService } from 'natmri/platform/ipc/common/mainProcessService'
import type { IPCServer } from 'natmri/base/parts/ipc/common/ipc'
import type { ServicesAccessor } from 'natmri/base/common/instantiation'

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
    ipcRenderer.once('vscode:electron-main->shared-process=exit', onExit)
  }

  async initialize() {
    const mainInstantionService = this.initServices()

    mainInstantionService.invokeFunction(accessor => this.initChannels(accessor))
  }

  private initServices() {
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

    return new InstantiationService(services)
  }

  private initChannels(accessor: ServicesAccessor) {

  }
}

async function main() {
  const sharedProcess = new SharedProcess()

  ipcRenderer.send('vscode:shared-process->electron-main=ipc-ready')

  await sharedProcess.initialize()

  ipcRenderer.send('vscode:shared-process->electron-main=init-done')
}

await main()
