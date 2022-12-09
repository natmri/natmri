/* eslint-disable dot-notation */
import EventEmitter from 'node:events'
import type { ParsedArgs } from 'minimist'
import { app, dialog, protocol } from 'electron'
import minimist from 'minimist'
import { dev } from 'eevi-is'
import { Emitter, Event } from '@livemoe/utils'
import { toErrorMessage } from './utils'

export type FrameworkMode = 'relaunch' | 'self' | 'normal'

export interface IFrameApplicationLifecycle {
  onAppStaring(mode: FrameworkMode): void

  onBeforeReady(args: ParsedArgs): void
  onReady(args: ParsedArgs): void
  onAfterReady(args: ParsedArgs): void

  onRequestSingleLock (singleInstanceLock: boolean): boolean
  onAppSelfStaringUp(): void
  onAppSelfStaringUpChange(status: boolean): void
  onSecondAppInstance(e: Electron.Event, args: string[], workingDirectory: string, additionalData: unknown): boolean

  onBeforeRelaunch(options?: Electron.RelaunchOptions): void
  onRelaunch(options?: Electron.RelaunchOptions): void
  onAfterRelaunch(options?: Electron.RelaunchOptions): void

  onBeforeQuit(code: number): void
  onWillQuit(e: Electron.Event): void
  onQuit(e: Electron.Event): void
}

export interface IFrameApplication extends Partial<IFrameApplicationLifecycle> {
  enableSelfStaringUp(options?: Electron.LoginItemSettingsOptions): void
  disableSelfStaringUp(options?: Electron.LoginItemSettingsOptions): void
  hasSelfStaringUp(options?: Electron.LoginItemSettingsOptions): boolean
  relaunch(options?: Electron.RelaunchOptions): void
  quit(): void
  exit(code?: number): void
}

export interface IFrameApplicationProtocol {
  name: string
  privileges: Electron.Privileges
}

export interface IFrameApplicationConfiguration {
  single?: boolean
  protocols?: IFrameApplicationProtocol[]
}

export abstract class FrameworkApplication extends EventEmitter implements IFrameApplication {
  private dev = dev()
  private options: Required<IFrameApplicationConfiguration>
  protected args: ParsedArgs

  constructor(options?: IFrameApplicationConfiguration) {
    super()
    this.args = minimist(process.argv.slice(this.dev ? 4 : 2))
    this.$parseConfiguration(options ?? {})
    this.$framework_event()
    this.$framework()
  }

  private $parseConfiguration(options: IFrameApplicationConfiguration) {
    const _options = {} as Required<IFrameApplicationConfiguration>

    _options.single = options.single ?? true
    _options.protocols = options.protocols ?? []

    this.options = _options
  }

  private async $framework() {
    if (this.args['--'].includes(`${app.getName()}Self`))
      this['onAppStaring']?.('self')
    else if (this.args['--'].includes(`${app.getName()}Relaunch`))
      this['onAppStaring']?.('relaunch')
    else
      this['onAppStaring']?.('normal')

    const getSingleInstanceLock = new Emitter<void>()
    const gotSingleInstanceLock = Event.toPromise(getSingleInstanceLock.event)
    if (this.options.single && !app.hasSingleInstanceLock()) {
      const singleInstanceLock = app.requestSingleInstanceLock()
      if (singleInstanceLock)
        getSingleInstanceLock.fire()
      const c = this['onRequestSingleLock']?.(singleInstanceLock)
      if (!c && this['onRequestSingleLock'])
        this.quit()
    }

    gotSingleInstanceLock
      .then(() => this.$framework_before_ready)
      .then(() => this['onBeforeReady']?.(this.args))
      .then(app.whenReady)
      .then(() => this.$framework_ready)
      .then(() => this['onReady']?.(this.args))
      .then(() => this.$framework_after_ready)
      .then(() => this['onAfterReady']?.(this.args))
  }

  private async $framework_before_ready() {
    this.$framework_error_hander()

    const schemes: Electron.CustomScheme[] = this.options.protocols.map(v => ({
      scheme: v.name,
      privileges: v.privileges,
    }))

    protocol.registerSchemesAsPrivileged(schemes)
  }

  private async $framework_ready() {

  }

  private async $framework_after_ready() {

  }

  private async $framework_event() {
    app.on('second-instance', (e, argv, workingDirectory, additionalData) => {
      this['onSecondAppInstance']?.(e, argv, workingDirectory, additionalData)
    })

    app.on('will-quit', e => this['onWillQuit']?.(e))
    app.on('before-quit', e => this['onBeforeQuit']?.(e))
    app.on('quit', e => this['onQuit']?.(e))
  }

  private async $framework_error_hander() {
    process.on('uncaughtException', (error, _) => {
      if (this.dev)
        dialog.showErrorBox(error.name, toErrorMessage(error))

      this['onError']?.(error)
    })

    process.on('unhandledRejection', (reason, promise) => {
      promise.catch((error) => {
        if (this.dev)
          dialog.showErrorBox(error.name, toErrorMessage(new Error(reason as string)))
      })
      this['onError']?.(new Error(reason as string))
    })
  }

  enableSelfStaringUp(options?: Electron.LoginItemSettingsOptions): void {
    if (!this.hasSelfStaringUp(options)) {
      app.setLoginItemSettings({
        ...options,
        openAtLogin: true,
        args: [...options.args, `${app.getName()}Self`],
      })
    }
  }

  disableSelfStaringUp(options?: Electron.LoginItemSettingsOptions): void {
    if (this.hasSelfStaringUp(options)) {
      app.setLoginItemSettings({
        ...options,
        openAtLogin: false,
        args: [...options.args, `${app.getName()}Self`],
      })
    }
  }

  hasSelfStaringUp(options?: Electron.LoginItemSettingsOptions): boolean {
    return app.getLoginItemSettings({
      ...options,
      args: [...options.args, `${app.getName()}Self`],
    }).openAtLogin
  }

  relaunch(options?: Electron.RelaunchOptions): void {
    this['onBeforeRelaunch'](options)
    process.nextTick(() => app.relaunch({
      ...(options || {}),
      args: [...(options && options.args), `${app.getName()}Relaunch`],
    }))
    this['onAfterRelaunch']?.(options)
  }

  quit(): void {
    process.nextTick(() => app.quit())
  }

  exit(code?: number): void {
    process.nextTick(() => app.exit(code))
  }
}
