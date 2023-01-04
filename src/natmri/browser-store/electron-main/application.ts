import { IInstantiationService, InstantiationService, ServiceCollection, SyncDescriptor } from 'natmri/base/common/instantiation'
import { Disposable, DisposableStore } from 'natmri/base/common/lifecycle'
import { INativeEnvironmentService } from 'natmri/platform/environment/common/environment'
import { NativeEnvironmentMainService } from 'natmri/platform/environment/electron-main/environmentMainService'
import { ILifecycleMainService, LifecycleMainService, ShutdownReason } from 'natmri/platform/lifecycle/electron-main/lifecycleMainService'
import { ILoggerService } from 'natmri/platform/log/common/log'
import { LoggerMainService } from 'natmri/platform/log/node/logMainService'
import { IProtocolMainService, ProtocolMainService } from 'natmri/platform/protocol/electron-main/protocolMainService'
import { INativeTrayMainService, NativeTrayMainService } from 'natmri/platform/tray/electron-main/nativeTrayMainService'
import { onUnexpectedError, setUnexpectedErrorHandler } from 'natmri/base/common/errors'
import { Server as ElectronIPCServer } from 'natmri/base/parts/ipc/electron-main/ipc.electron'
import type { ServicesAccessor } from 'natmri/base/common/instantiation'
import { BrowserWindow } from 'electron'

export class Application extends Disposable {
  constructor(
    @IInstantiationService private readonly mainInstantiationService: IInstantiationService,
    @ILoggerService private readonly logService: ILoggerService,
    @INativeEnvironmentService private readonly environemtService: INativeEnvironmentService,
    @ILifecycleMainService private readonly lifecycleService: ILifecycleMainService,
  ) {
    super()

    this.registerListeners()
  }

  async startup() {
    this.logService.debug('Starting Natmri!')

    const win = new BrowserWindow()
    win.webContents.openDevTools({ mode: 'detach' })
    win.loadURL(this.environemtService.getPagesPath('natmri/browser-store/electron-browser/natmri/index.html'))

    // Main process server (electron IPC based)
    const mainProcessElectronServer = new ElectronIPCServer()
    this.lifecycleService.onWillShutdown((e) => {
      if (e.reason === ShutdownReason.KILL) {
        // When we go down abnormally, make sure to free up
        // any IPC we accept from other windows to reduce
        // the chance of doing work after we go down. Kill
        // is special in that it does not orderly shutdown
        // windows.
        mainProcessElectronServer.dispose()
      }
    })
  }

  private registerListeners(): void {
    // We handle uncaught exceptions here to prevent electron from opening a dialog to the user
    setUnexpectedErrorHandler(error => this.onUnexpectedError(error))
    process.on('uncaughtException', error => onUnexpectedError(error))
    process.on('unhandledRejection', (reason: unknown) => onUnexpectedError(reason))

    // Dispose on shutdown
    this.lifecycleService.onWillShutdown(() => this.dispose())
  }

  private onUnexpectedError(error: Error) {
    if (error) {
      this.logService.error(`[uncaught exception in main]: ${error}`)
      if (error.stack)
        this.logService.error(error.stack)
    }
  }

  static async createApplication() {
    const [instantianService, services] = this.createServices()

    // Tray
    services.set(INativeTrayMainService, new SyncDescriptor(NativeTrayMainService, [], false))

    try {
      await instantianService.invokeFunction(() => {
        return (instantianService.createInstance(new SyncDescriptor(Application)) as Application).startup()
      })
    }
    catch (error) {
      instantianService.invokeFunction(this.quit, error)
    }
  }

  private static createServices(): [InstantiationService, ServiceCollection] {
    const services = new ServiceCollection()
    const disposables = new DisposableStore()
    process.once('exit', () => disposables.dispose())

    // Environment
    const environmentMainService = new NativeEnvironmentMainService()
    services.set(INativeEnvironmentService, environmentMainService)

    // Logger
    const logService = new LoggerMainService()
    services.set(ILoggerService, logService)

    // Lifecycle
    services.set(ILifecycleMainService, new SyncDescriptor(LifecycleMainService, undefined, false))

    // Protocol
    services.set(IProtocolMainService, new ProtocolMainService(environmentMainService, logService))

    return [new InstantiationService(services, true), services]
  }

  private static quit(accessor: ServicesAccessor, reason?: Error): void {
    const logService = accessor.get(ILoggerService)
    const lifecycleMainService = accessor.get(ILifecycleMainService)

    let exitCode = 0

    if (reason) {
      exitCode = 1 // signal error to the outside

      if (reason.stack)
        logService.error(reason.stack)

      else
        logService.error(`Startup error: ${reason.toString()}`)
    }

    lifecycleMainService.kill(exitCode)
  }
}
