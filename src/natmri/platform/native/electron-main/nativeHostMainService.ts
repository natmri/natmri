import { arch, cpus, freemem, loadavg, platform, release, totalmem, type } from 'node:os'
import { screen, shell } from 'electron'
import { Event } from 'natmri/base/common/event'
import { createDecorator } from 'natmri/base/common/instantiation'
import { Disposable } from 'natmri/base/common/lifecycle'
import { ILifecycleMainService } from 'natmri/platform/lifecycle/electron-main/lifecycleMainService'
import { IWindowsMainService } from 'natmri/platform/windows/electron-main/windows'
import type { Display } from 'electron'
import type { ICommonNativeHostService, IOSProperties, IOSStatistics } from 'natmri/platform/native/common/native'
import type { INatmriWindow } from 'natmri/platform/window/electron-main/window'

export interface INativeHostMainService extends ICommonNativeHostService {
}

export const INativeHostMainService = createDecorator<INativeHostMainService>('nativeHostMainService')

export class NativeHostMainService extends Disposable implements INativeHostMainService {
  declare readonly _serviceBrand: undefined

  constructor(
    @ILifecycleMainService private readonly lifecycleMainService: ILifecycleMainService,
    @IWindowsMainService private readonly windowsMainService: IWindowsMainService,
  ) {
    super()
  }

  readonly onDidChangeDisplay = Event.debounce(Event.any(
    Event.filter(Event.fromNodeEventEmitter(screen, 'display-metrics-changed', (_event: Electron.Event, _display: Display, changedMetrics?: string[]) => changedMetrics), (changedMetrics) => {
      // Electron will emit 'display-metrics-changed' events even when actually
      // going fullscreen, because the dock hides. However, we do not want to
      // react on this event as there is no change in display bounds.
      return !(Array.isArray(changedMetrics) && changedMetrics.length === 1 && changedMetrics[0] === 'workArea')
    }),
    Event.fromNodeEventEmitter(screen, 'display-added'),
    Event.fromNodeEventEmitter(screen, 'display-removed'),
  ), changedMetrics => changedMetrics, 100)

  // #region Lifecycle

  async notifyReady(windowId: number | undefined): Promise<void> {
    const window = this.windowById(windowId)
    window?.setReady()
  }

  async relaunch(options?: { addArgs?: string[] | undefined; removeArgs?: string[] | undefined } | undefined): Promise<void> {
    return this.lifecycleMainService.relaunch(options)
  }

  async closeWindow(windowId: number): Promise<void> {
    this.windowById(windowId)?.close()
  }

  async quit(): Promise<void> {
    await this.lifecycleMainService.quit()
  }

  async exit(code: number): Promise<void> {
    await this.lifecycleMainService.kill(code)
  }

  // #endregion

  async isAdmin(): Promise<boolean> {
    const isAdmin = (await import('native-is-elevated-rs')).isElevated()

    return isAdmin
  }

  // #region shell

  async openExternal(url: string): Promise<void> {
    await shell.openExternal(url)
  }

  // #endregion

  async getOSStatistics(): Promise<IOSStatistics> {
    return {
      totalmem: totalmem(),
      freemem: freemem(),
      loadavg: loadavg(),
    }
  }

  async getOSProperties(): Promise<IOSProperties> {
    return {
      arch: arch(),
      platform: platform(),
      release: release(),
      type: type(),
      cpus: cpus(),
    }
  }

  private windowById(windowId: number | undefined): INatmriWindow | undefined {
    if (typeof windowId !== 'number')
      return undefined

    return this.windowsMainService.getWindowById(windowId)
  }
}
