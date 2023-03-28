import type { Event as ElectronEvent, IpcMainEvent, MessagePortMain } from 'electron'
import { BrowserWindow, ipcMain } from 'electron'
import { Barrier, DeferredPromise } from 'natmri/base/common/async'
import { toErrorMessage } from 'natmri/base/common/errors'
import { Disposable } from 'natmri/base/common/lifecycle'
import { assertIsDefined } from 'natmri/base/common/types'
import { ILifecycleMainService } from 'natmri/platform/lifecycle/electron-main/lifecycleMainService'
import { ILoggerService } from 'natmri/platform/log/common/log'
import { connect as connectMessagePort } from 'natmri/base/parts/ipc/electron-main/ipc.mp'
import { INativeEnvironmentMainService } from 'natmri/platform/environment/electron-main/environmentMainService'

export class SharedProcess extends Disposable {
  private readonly firstWindowConnectionBarrier = new Barrier()

  private window: BrowserWindow | undefined = undefined
  private windowCloseListener: ((event: ElectronEvent) => void) | undefined = undefined

  constructor(
    @ILoggerService private readonly logService: ILoggerService,
    @ILifecycleMainService private readonly lifecycleMainService: ILifecycleMainService,
    @INativeEnvironmentMainService private readonly environmentMainService: INativeEnvironmentMainService,
  ) {
    super()

    this.registerListeners()
  }

  private registerListeners() {
    // Shared process connections from workbench windows
    ipcMain.on('vscode:createSharedProcessMessageChannel', (e, nonce: string) => this.onWindowConnection(e, nonce))

    // Lifecycle
    this._register(this.lifecycleMainService.onWillShutdown(() => this.onWillShutdown()))
  }

  private async onWindowConnection(e: IpcMainEvent, nonce: string) {
    this.logService.trace('[SharedProcess] on vscode:createSharedProcessMessageChannel')

    // release barrier if this is the first window connection
    if (!this.firstWindowConnectionBarrier.isOpen())
      this.firstWindowConnectionBarrier.open()

    // await the shared process to be overall ready
    // we do not just wait for IPC ready because the
    // workbench window will communicate directly

    await this.whenReady()

    // connect to the shared process
    const port = await this.connect()

    // Check back if the requesting window meanwhile closed
    // Since shared process is delayed on startup there is
    // a chance that the window close before the shared process
    // was ready for a connection.

    if (e.sender.isDestroyed())
      return port.close()

    // send the port back to the requesting window
    e.sender.postMessage('vscode:createSharedProcessMessageChannelResult', nonce, [port])
  }

  private onWillShutdown() {
    this.logService.trace('[SharedProcess] onWillShutdown')

    const window = this.window
    if (!window)
      return

    // Signal exit to shared process when shutting down
    this.sendToWindow('vscode:electron-main->shared-process=exit')

    // Electron seems to crash on Windows without this setTimeout :|
    setTimeout(() => {
      try {
        this.logService.trace('[SharedProcess] onWillShutdown window.close()')
        window.close()
      }
      catch (error) {
        this.logService.trace(`[SharedProcess] onWillShutdown window.close() error: ${error}`) // ignore, as electron is already shutting down
      }

      this.window = undefined
    }, 0)
  }

  private sendToWindow(channel: string, ...args: any[]): void {
    if (!this.isWindowAlive()) {
      this.logService.warn(`Sending IPC message to channel '${channel}' for shared process that is destroyed`)
      return
    }

    try {
      this.window?.webContents.send(channel, ...args)
    }
    catch (error) {
      this.logService.warn(`Error sending IPC message to channel '${channel}' of shared process: ${toErrorMessage(error)}`)
    }
  }

  private _whenReady: Promise<void> | undefined = undefined
  whenReady(): Promise<void> {
    if (!this._whenReady) {
      this._whenReady = (async () => {
        // Wait for shared process being ready to accept connection
        await this.whenIpcReady

        // Overall signal that the shared process was loaded and
        // all services within have been created.

        const whenReady = new DeferredPromise<void>()

        await whenReady.p
        this.logService.trace('[SharedProcess] Overall ready')
      })()
    }

    return this._whenReady
  }

  private _whenIpcReady: Promise<void> | undefined = undefined
  private get whenIpcReady() {
    if (!this._whenIpcReady) {
      this._whenIpcReady = (async () => {
        // Always wait for first window asking for connection
        await this.firstWindowConnectionBarrier.wait()

        // Spawn shared process
        this.createWindow()
        this.registerSharedProcessListeners()

        // Wait for shared process indicating that IPC connections are accepted
        const sharedProcessIpcReady = new DeferredPromise<void>()
        ipcMain.once('vscode:shared-process->electron-main=ipc-ready', () => sharedProcessIpcReady.complete())

        await sharedProcessIpcReady.p
        this.logService.trace('[SharedProcess] IPC ready')
      })()
    }

    return this._whenIpcReady
  }

  private createWindow(): void {
    this.window = new BrowserWindow({
      show: false,
      title: 'Shared Process',
      webPreferences: {
        nodeIntegration: true,
        nodeIntegrationInWorker: true,
        contextIsolation: false,
        enableWebSQL: false,
        spellcheck: false,
        images: false,
        webgl: false,
      },
    })

    this.window.loadURL(this.environmentMainService.getPageURI('natmri/store/electron-browser/sharedProcess.html').fsPath)
  }

  private registerSharedProcessListeners() {
    // Hidden window
    if (this.window) {
      // Prevent the window from closing
      this.windowCloseListener = (e: ElectronEvent) => {
        this.logService.trace('SharedProcess#close prevented')

        // We never allow to close the shared process unless we get explicitly disposed()
        e.preventDefault()

        // Still hide the window though if visible
        if (this.window?.isVisible())
          this.window.hide()
      }

      this.window.on('close', this.windowCloseListener)

      // Crashes & Unresponsive & Failed to load
      // this.window.webContents.on('render-process-gone', (event, details) => this._onDidError.fire({ type: WindowError.PROCESS_GONE, details }))
      // this.window.on('unresponsive', () => this._onDidError.fire({ type: WindowError.UNRESPONSIVE }))
      // this.window.webContents.on('did-fail-load', (event, exitCode, reason) => this._onDidError.fire({ type: WindowError.LOAD, details: { reason, exitCode } }))
    }
  }

  async connect(): Promise<MessagePortMain> {
    // Wait for shared process being ready to accept connection
    await this.whenIpcReady

    return connectMessagePort(assertIsDefined(this.window))
  }

  private isWindowAlive(): boolean {
    const window = this.window
    if (!window)
      return false

    return !window.isDestroyed() && !window.webContents.isDestroyed()
  }
}
