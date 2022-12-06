import type { ParsedArgs } from 'minimist'
import { app } from 'electron'
import minimist from 'minimist'
import { dev } from 'eevi-is'
import { Emitter, Event } from '@livemoe/utils'

export interface IFrameApplicationLifecycle {
  onBeforeReady?: (args: ParsedArgs) => void
  onReady?: (args: ParsedArgs) => void
  onAfterReady?: (args: ParsedArgs) => void

  onRequestSingleLock?: (singleInstanceLock: boolean) => boolean

  onBeforeRelaunch?: (options?: Electron.RelaunchOptions) => void
  onRelaunch?: (options?: Electron.RelaunchOptions) => void
  onAfterRelaunch?: (options?: Electron.RelaunchOptions) => void

  onBeforeQuit?: (code: number) => void
  onQuit?: (code: number) => void
  onAfterQuit?: (code?: number) => void
}

export interface IFrameApplication extends IFrameApplicationLifecycle {
  relaunch(options?: Electron.RelaunchOptions): void
  quit(): void
  exit(code?: number): void
}

export interface IFrameApplicationConfiguration {
  single?: boolean
}

export abstract class FrameworkApplication implements IFrameApplication {
  private dev = dev()
  private options: Required<IFrameApplicationConfiguration>
  protected args: ParsedArgs

  constructor(options?: IFrameApplicationConfiguration) {
    this.args = minimist(process.argv.slice(this.dev ? 4 : 2))
    this.$parseConfiguration(options ?? {})
    this.$framework()
  }

  private $parseConfiguration(options: IFrameApplicationConfiguration) {
    const _options = {} as Required<IFrameApplicationConfiguration>

    _options.single = options.single ?? true

    this.options = _options
  }

  private async $framework() {
    const getSingleInstanceLock = new Emitter<void>()
    const gotSingleInstanceLock = Event.toPromise(getSingleInstanceLock.event)
    if (this.options.single && !app.hasSingleInstanceLock()) {
      const singleInstanceLock = app.requestSingleInstanceLock()
      if (singleInstanceLock)
        getSingleInstanceLock.fire()
      const c = this?.onRequestSingleLock(singleInstanceLock)
      if (!c)
        this.quit()
    }

    gotSingleInstanceLock
      .then(() => this?.onBeforeReady(this.args))
      .then(app.whenReady)
      .then(() => this?.onReady(this.args))
      .then(() => this.$framework_ready)
      .then(() => this?.onAfterReady(this.args))
  }

  private async $framework_ready() {

  }

  private async $framework_event() {
  }

  abstract onReady?: (args: ParsedArgs) => void
  abstract onBeforeReady?: (args: ParsedArgs) => void
  abstract onAfterReady?: (args: ParsedArgs) => void
  abstract onAfterQuit?: (code?: number) => void
  abstract onBeforeQuit?: (code: number) => void
  abstract onQuit?: (code: number) => void
  abstract onAfterRelaunch?: (options?: Electron.RelaunchOptions) => void
  abstract onBeforeRelaunch?: (options?: Electron.RelaunchOptions) => void
  abstract onRelaunch?: (options?: Electron.RelaunchOptions) => void
  abstract onRequestSingleLock?: (singleInstanceLock: boolean) => boolean

  relaunch(options?: Electron.RelaunchOptions): void {
    app.relaunch(options)
  }

  quit(): void {
    app.quit()
  }

  exit(code?: number): void {
    app.exit(code ?? 0)
  }
}
