import { join } from 'path'
import { BrowserWindow, session } from 'electron'
import { InstantiationService, ServiceCollection, SyncDescriptor } from '@livemoe/core'
import { runWhenIdle } from '@livemoe/utils'
import { ILoggerService, LoggerService } from './services/log'
import { INativeTrayService, NativeTrayService } from './services/tray'
import { ILifecycleService, LifecycleService } from './services/lifecycle'
import { IStorageMainService, StorageMainService } from './services/storage'
import { INativeEnvironmentService, NativeEnvironmentService } from './services/environment'
import { IProtocolService, ProtocolService } from './services/protocol'
import { resolvePages } from './helper/utils'

export class Application {
  constructor(
    @INativeTrayService private readonly nativeTrayService: INativeTrayService,
    @ILoggerService private readonly logService: ILoggerService,
    @IProtocolService private readonly protocolService: ProtocolService,
    @INativeEnvironmentService private readonly nativeEnvironment: INativeEnvironmentService,
  ) {
    this.configurationSession()
    runWhenIdle(() => this.startup())
    this.logService.info('[Application] initial')
  }

  static async createApplication() {
    const [instantianService] = this.createServices()

    return instantianService.createInstance(Application)
  }

  private static createServices(): [InstantiationService] {
    const services = new ServiceCollection()

    services.set(INativeEnvironmentService, new SyncDescriptor(NativeEnvironmentService))
    services.set(ILoggerService, new SyncDescriptor(LoggerService))
    services.set(INativeTrayService, new SyncDescriptor(NativeTrayService, [], true))
    services.set(ILifecycleService, new SyncDescriptor(LifecycleService))
    services.set(IStorageMainService, new SyncDescriptor(StorageMainService))
    services.set(IProtocolService, new SyncDescriptor(ProtocolService, [], false))

    return [new InstantiationService(services, true)]
  }

  private configurationSession() {
    session.defaultSession.setPreloads([
      join(this.nativeEnvironment.preloadPath, 'globals.js'),
      join(this.nativeEnvironment.preloadPath, 'test1.js'),
      join(this.nativeEnvironment.preloadPath, 'common.js'),
    ])
  }

  startup() {
    const win = new BrowserWindow({
      webPreferences: {
        contextIsolation: true,
        sandbox: false,
      },
    })

    win.webContents.openDevTools({ mode: 'detach' })
    win.loadURL(resolvePages('main'))
  }
}
