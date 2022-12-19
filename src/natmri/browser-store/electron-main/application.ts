import { BrowserWindow, session } from 'electron'
import { InstantiationService, ServiceCollection, SyncDescriptor } from '@livemoe/core'
import { runWhenIdle } from '@livemoe/utils'
import { ILoggerService } from 'natmri/platform/log/common/log'
import { LoggerService } from 'natmri/platform/log/node/logService'
import { INativeTrayService, NativeTrayService } from 'natmri/platform/tray/electron-main/trayService'
import { INativeEnvironmentService } from 'natmri/platform/environment/common/environment'
import { NativeEnvironmentService } from 'natmri/platform/environment/electron-main/environmentService'
import { ILifecycleService, LifecycleService } from 'natmri/platform/lifecycle/electron-main/lifecycleService'
import { IProtocolService, ProtocolService } from 'natmri/platform/protocol/electron-main/protocolService'
import { join } from 'natmri/base/common/path'

export class Application {
  constructor(
    @INativeTrayService private readonly nativeTrayService: INativeTrayService,
    @ILoggerService private readonly logService: ILoggerService,
    @IProtocolService private readonly protocolService: ProtocolService,
    @INativeEnvironmentService private readonly nativeEnvironment: INativeEnvironmentService,
  ) {
    this.configurationSession()
    this.logService.info('[Application] initial')
    runWhenIdle(() => this.startup())
  }

  static async createApplication() {
    const [instantianService] = this.createServices()

    return instantianService.createInstance(Application) as Application
  }

  private static createServices(): [InstantiationService] {
    const services = new ServiceCollection()

    services.set(INativeEnvironmentService, new SyncDescriptor(NativeEnvironmentService))
    services.set(ILoggerService, new SyncDescriptor(LoggerService))
    services.set(INativeTrayService, new SyncDescriptor(NativeTrayService, [], false))
    services.set(ILifecycleService, new SyncDescriptor(LifecycleService))
    services.set(IProtocolService, new SyncDescriptor(ProtocolService, [], false))

    return [new InstantiationService(services, true)]
  }

  private configurationSession() {
    session.defaultSession.setPreloads([
      join(this.nativeEnvironment.preloadPath, 'globals.js'),
    ])
  }

  startup() {
    const win = new BrowserWindow({
      webPreferences: {
        contextIsolation: true,
        sandbox: false,
      },
    })

    const win2 = new BrowserWindow({
      webPreferences: {
        contextIsolation: true,
        sandbox: false,
      },
    })

    win.webContents.openDevTools({ mode: 'detach' })
    win2.webContents.openDevTools({ mode: 'detach' })
    win.loadURL(this.nativeEnvironment.getPagesPath('browser-store/electron-browser/natmri/index.html'))
    win2.loadURL(this.nativeEnvironment.getPagesPath('browser-store/electron-browser/settings/index.html'))
  }
}
