import { app } from 'electron'
import { Application } from 'natmri/store/electron-main/application'
import { InstantiationService, ServiceCollection, SyncDescriptor } from 'natmri/base/common/instantiation'
import { INativeEnvironmentMainService, NativeEnvironmentMainService } from 'natmri/platform/environment/electron-main/environmentMainService'
import { ILifecycleMainService, LifecycleMainService } from 'natmri/platform/lifecycle/electron-main/lifecycleMainService'
import { ILoggerService } from 'natmri/platform/log/common/log'
import { LoggerMainService } from 'natmri/platform/log/electron-main/logMainService'
import { IProtocolMainService, ProtocolMainService } from 'natmri/platform/protocol/electron-main/protocolMainService'
import type { ServicesAccessor } from 'natmri/base/common/instantiation'

export class Main {
  main() {
    try {
      this.startup()
    }
    catch (error) {
      console.error(error.message)
      app.exit(1)
    }
  }

  private async startup() {
    const [instantiationService] = this.createServices()

    try {
      await instantiationService.invokeFunction(() => {
        return instantiationService.createInstance(Application).startup()
      })
    }
    catch (error) {
      await instantiationService.invokeFunction(this.quit, error)
    }
  }

  private createServices(): [InstantiationService] {
    const services = new ServiceCollection()
    // Environment
    const environmentMainService = new NativeEnvironmentMainService()
    services.set(INativeEnvironmentMainService, environmentMainService)

    // Logger
    const logService = new LoggerMainService()
    services.set(ILoggerService, logService)

    // Lifecycle
    services.set(ILifecycleMainService, new SyncDescriptor(LifecycleMainService))

    // Protocol
    services.set(IProtocolMainService, new ProtocolMainService(environmentMainService, logService))

    return [new InstantiationService(services, true)]
  }

  private async quit(accessor: ServicesAccessor, reason?: Error): Promise<void> {
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

    await lifecycleMainService.kill(exitCode)
  }
}
