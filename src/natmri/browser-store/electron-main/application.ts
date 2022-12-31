import { join } from 'path'
import type { BrowserWindowConstructorOptions } from 'electron'
import { BrowserWindow } from 'electron'
import { runWhenIdle } from 'natmri/base/common/async'
import { InstantiationService, ServiceCollection, SyncDescriptor } from 'natmri/base/common/instantiation'
import { INativeEnvironmentService } from 'natmri/platform/environment/common/environment'
import { NativeEnvironmentMainService } from 'natmri/platform/environment/electron-main/environmentMainService'
import { ILifecycleMainService, LifecycleMainService } from 'natmri/platform/lifecycle/electron-main/lifecycleMainService'
import { ILoggerService } from 'natmri/platform/log/common/log'
import { LoggerMainService } from 'natmri/platform/log/node/logMainService'
import { IProtocolService, ProtocolMainService } from 'natmri/platform/protocol/electron-main/protocolMainService'
import { INativeTrayMainService, NativeTrayMainService } from 'natmri/platform/tray/electron-main/nativeTrayMainService'

export class Application {
  constructor(
    @INativeTrayMainService private readonly nativeTrayService: INativeTrayMainService,
    @ILoggerService private readonly logService: ILoggerService,
    @IProtocolService private readonly protocolService: ProtocolMainService,
    @INativeEnvironmentService private readonly nativeEnvironment: INativeEnvironmentService,
    @ILifecycleMainService private readonly lifecycleService: ILifecycleMainService,
  ) {
    runWhenIdle(() => this.startup())
  }

  static async createApplication() {
    const [instantianService] = this.createServices()

    return instantianService.createInstance(new SyncDescriptor(Application))
  }

  private static createServices(): [InstantiationService] {
    const services = new ServiceCollection()

    services.set(INativeEnvironmentService, new SyncDescriptor(NativeEnvironmentMainService))
    services.set(ILoggerService, new SyncDescriptor(LoggerMainService))
    services.set(INativeTrayMainService, new SyncDescriptor(NativeTrayMainService, [], false))
    services.set(ILifecycleMainService, new SyncDescriptor(LifecycleMainService))
    services.set(IProtocolService, new SyncDescriptor(ProtocolMainService, [], false))

    return [new InstantiationService(services, true)]
  }

  startup() {
    const options: BrowserWindowConstructorOptions = {
      frame: false,
      titleBarStyle: 'hidden',
      titleBarOverlay: {
        height: 29, // the smallest size of the title bar on windows accounting for the border on windows 11
        color: '#F8F8F8',
        symbolColor: '#FFFFFF',
      },
    }

    const win = new BrowserWindow(options)
    const WM_INITMENU = 0x0116 // https://docs.microsoft.com/en-us/windows/win32/menurc/wm-initmenu
    win.hookWindowMessage(WM_INITMENU, () => {
      win.setEnabled(false)
      setTimeout(() => {
        win.setEnabled(true)
      })

      return 0
    })
    win.webContents.openDevTools()
    win.loadURL(join(this.nativeEnvironment.getPagesPath('browser-store/electron-browser/natmri/index.html')))
  }
}
