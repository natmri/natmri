import { join } from 'path'
import type { IFrameApplicationConfiguration, IFrameApplicationLifecycle } from '@app/framework'
import { FrameworkApplication } from '@app/framework'
import { BrowserWindow, Menu, Tray, protocol } from 'electron'
import type { ParsedArgs } from 'minimist'
import fs from 'fs-extra'
import { rootPath } from './helper/paths'
import { resolveIconsPath, resolvePages, resolvePreload } from './helper/utils'

export class Application extends FrameworkApplication implements Partial<IFrameApplicationLifecycle> {
  static async createApplication(options?: IFrameApplicationConfiguration) {
    return new Application(options)
  }

  onBeforeReady(args: ParsedArgs) {
    Menu.setApplicationMenu(null)
    // eslint-disable-next-line no-console
    console.log(args)
  }

  onReady(_: ParsedArgs): void {
    protocol.registerStreamProtocol('natmri', (request, cb) => {
      const url = new URL(request.url)
      cb(fs.createReadStream(join(rootPath, 'assets', url.hostname, url.pathname)))
    })

    const win = new BrowserWindow({
      webPreferences: {
        sandbox: false,
        preload: resolvePreload('common'),
      },
    })

    win.on('ready-to-show', win.show.bind(win))
    win.loadURL(resolvePages('main'))

    win.webContents.openDevTools({ mode: 'detach' })

    const tray = new Tray(resolveIconsPath())

    tray.displayBalloon({
      title: 'Balloon',
      content: 'Balloon Content',
    })
  }
}
