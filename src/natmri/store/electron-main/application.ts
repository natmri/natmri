import path from 'node:path'
import { app } from 'electron'
import { IInstantiationService, ServiceCollection, SyncDescriptor } from 'natmri/base/common/instantiation'
import { Disposable } from 'natmri/base/common/lifecycle'
import { INativeEnvironmentMainService } from 'natmri/platform/environment/electron-main/environmentMainService'
import { ILifecycleMainService, LifecycleMainPhase, ShutdownReason } from 'natmri/platform/lifecycle/electron-main/lifecycleMainService'
import { ILoggerService } from 'natmri/platform/log/common/log'
import { INativeTrayMainService, NativeTrayMainService } from 'natmri/platform/tray/electron-main/nativeTrayMainService'
import { onUnexpectedError, setUnexpectedErrorHandler } from 'natmri/base/common/errors'
import { Server as ElectronIPCServer } from 'natmri/base/parts/ipc/electron-main/ipc.electron'
import { INativeHostMainService, NativeHostMainService } from 'natmri/platform/native/electron-main/nativeHostMainService'
import { IWindowsMainService } from 'natmri/platform/windows/electron-main/windows'
import { RunOnceScheduler, runWhenIdle } from 'natmri/base/common/async'
import { ProxyChannel } from 'natmri/base/parts/ipc/common/ipc'
import { WindowsMainService } from 'natmri/platform/windows/electron-main/windowsMainService'
import { isDevelopment } from 'natmri/base/common/environment'
import type { ServicesAccessor } from 'natmri/base/common/instantiation'
import { NatmriTray } from 'natmri/platform/tray/electron-main/tray'
import { WallpaperPlayer } from 'natmri/platform/wallpaper/electron-main/wallpaper'

export class Application extends Disposable {
  private nativeHostMainService: INativeHostMainService | undefined
  private nativeTrayMainService: INativeTrayMainService | undefined

  constructor(
    @IInstantiationService private readonly mainInstantiationService: IInstantiationService,
    @ILoggerService private readonly logService: ILoggerService,
    @INativeEnvironmentMainService private readonly nativeEnvironmentService: INativeEnvironmentMainService,
    @ILifecycleMainService private readonly lifecycleMainService: ILifecycleMainService,
  ) {
    super()

    this.registerListeners()
  }

  async startup() {
    this.logService.debug('Starting Natmri!')

    // Main process server (electron IPC based)
    const mainProcessElectronServer = new ElectronIPCServer()
    this.lifecycleMainService.onWillShutdown((e) => {
      if (e.reason === ShutdownReason.KILL) {
        // When we go down abnormally, make sure to free up
        // any IPC we accept from other windows to reduce
        // the chance of doing work after we go down. Kill
        // is special in that it does not orderly shutdown
        // windows.
        mainProcessElectronServer.dispose()
      }
    })

    // Init Services
    const appInstantiationService = await this.initServices()

    // Init Channels
    await appInstantiationService.invokeFunction(accessor => this.initChannels(accessor, mainProcessElectronServer))

    this.lifecycleMainService.phase = LifecycleMainPhase.Ready

    const player = appInstantiationService.createInstance(WallpaperPlayer)
    player.load(path.resolve('/Users/avatar/Downloads/2000075052/index.html'))

    // Set lifecycle phase to `Eventually` after a short delay and when idle (min 2.5sec, max 5sec)
    const eventuallyPhaseScheduler = this._register(new RunOnceScheduler(() => {
      this._register(runWhenIdle(() => this.lifecycleMainService.phase = LifecycleMainPhase.Eventually, 2500))
    }, 2500))
    eventuallyPhaseScheduler.schedule()
  }

  private async initServices(): Promise<IInstantiationService> {
    const services = new ServiceCollection()

    // App updates

    // Windows manager
    services.set(IWindowsMainService, new SyncDescriptor(WindowsMainService))

    // Native host
    services.set(INativeHostMainService, new SyncDescriptor(NativeHostMainService))

    const appInstantiationService = this.mainInstantiationService.createChild(services)

    const trayServices: readonly [INativeEnvironmentMainService, INativeHostMainService] = appInstantiationService.invokeFunction(accessor => [accessor.get(INativeEnvironmentMainService), accessor.get(INativeHostMainService)] as const)
    // Init native tray
    const tray = new NatmriTray(trayServices[0], trayServices[1])

    services.set(INativeTrayMainService, new SyncDescriptor(NativeTrayMainService, [tray]))

    return appInstantiationService
  }

  private async initChannels(accessor: ServicesAccessor, mainProcessElectronServer: ElectronIPCServer) {
    // Native Host
    this.nativeHostMainService = accessor.get(INativeHostMainService)
    const nativeHostChannel = ProxyChannel.fromService<string>(this.nativeHostMainService)
    mainProcessElectronServer.registerChannel('nativeHost', nativeHostChannel)
  }

  private registerListeners(): void {
    // We handle uncaught exceptions here to prevent electron from opening a dialog to the user
    setUnexpectedErrorHandler(error => this.onUnexpectedError(error))
    process.on('uncaughtException', error => onUnexpectedError(error))
    process.on('unhandledRejection', (reason: unknown) => onUnexpectedError(reason))

    // Dispose on shutdown
    this.lifecycleMainService.onWillShutdown(() => this.dispose())

    // Windows on create
    app.on('web-contents-created', (_event, contents) => {
      contents.on('will-navigate', (event) => {
        this.logService.error('webContents#will-navigate: Prevented webcontent navigation')

        if (isDevelopment)
          contents.reload()
        else
          event.preventDefault()
      })

      contents.setWindowOpenHandler(({ url }) => {
        this.nativeHostMainService?.openExternal(url)

        return { action: 'deny' }
      })
    })
  }

  private onUnexpectedError(error: Error) {
    if (error) {
      this.logService.error(`[uncaught exception in main]: ${error}`)
      if (error.stack)
        this.logService.error(error.stack)
    }
  }
}
