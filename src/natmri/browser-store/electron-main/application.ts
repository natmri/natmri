import { join } from 'path'
import type { BrowserWindowConstructorOptions } from 'electron'
import { BrowserWindow } from 'electron'
import { runWhenIdle } from 'natmri/base/common/async'
import { InstantiationService, ServiceCollection, SyncDescriptor } from 'natmri/base/common/instantiation'
import { INativeEnvironmentService } from 'natmri/platform/environment/common/environment'
import { NativeEnvironmentService } from 'natmri/platform/environment/electron-main/environmentService'
import { ILifecycleService, LifecycleService } from 'natmri/platform/lifecycle/electron-main/lifecycleService'
import { ILoggerService } from 'natmri/platform/log/common/log'
import { LoggerMainService } from 'natmri/platform/log/node/logMainService'
import { IProtocolService, ProtocolMainService } from 'natmri/platform/protocol/electron-main/protocolMainService'
import { INativeTrayService, NativeTrayService } from 'natmri/platform/tray/electron-main/trayService'

export class Application {
  constructor(
    @INativeTrayService private readonly nativeTrayService: INativeTrayService,
    @ILoggerService private readonly logService: ILoggerService,
    @IProtocolService private readonly protocolService: ProtocolMainService,
    @INativeEnvironmentService private readonly nativeEnvironment: INativeEnvironmentService,
    @ILifecycleService private readonly lifecycleService: ILifecycleService,
  ) {
    runWhenIdle(() => this.startup())
  }

  static async createApplication() {
    const [instantianService] = this.createServices()

    return instantianService.createInstance(new SyncDescriptor(Application))
  }

  private static createServices(): [InstantiationService] {
    const services = new ServiceCollection()

    services.set(INativeEnvironmentService, new SyncDescriptor(NativeEnvironmentService))
    services.set(ILoggerService, new SyncDescriptor(LoggerMainService))
    services.set(INativeTrayService, new SyncDescriptor(NativeTrayService, [], false))
    services.set(ILifecycleService, new SyncDescriptor(LifecycleService))
    services.set(IProtocolService, new SyncDescriptor(ProtocolMainService, [], false))

    return [new InstantiationService(services, true)]
  }

  startup() {
    const options: BrowserWindowConstructorOptions = {
      frame: false,
      titleBarStyle: 'hidden',
      titleBarOverlay: {
        height: 30, // the smallest size of the title bar on windows accounting for the border on windows 11
        color: '#F8F8F8',
        symbolColor: '#FFFFFF',
      },
    }

    const win = new BrowserWindow(options)
    win.webContents.openDevTools()
    win.loadURL(join(this.nativeEnvironment.getPagesPath('browser-store/electron-browser/natmri/index.html')))
  }
}
