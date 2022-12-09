import { join } from 'path'
import fs from 'fs'
import { BrowserWindow, Tray, app, ipcMain, protocol, session } from 'electron'
import { Emitter, Event } from '@livemoe/utils'
import { rootPath } from 'helper/paths'
import { Application } from './application'
import { resolveIconsPath, resolvePages, resolvePreload } from '~/helper/utils'

Application
  .createApplication({

  })
  .catch(console.error)

const getSingleInstanceLock = new Emitter<void>()
const gotSingleInstanceLock = Event.toPromise(getSingleInstanceLock.event)

async function beforeReady() {
  if (!process.env.PLAYWRIGHT) {
    protocol.registerSchemesAsPrivileged([
      {
        scheme: 'app',
        privileges: {
          secure: true,
          standard: true,
          stream: true,
          bypassCSP: true,
          supportFetchAPI: true,
          corsEnabled: true,
        },
      },
    ])
  }
}

async function afterReady() {
  if (!process.env.PLAYWRIGHT) {
    protocol.registerStreamProtocol('app', (request, cb) => {
      const url = new URL(request.url)
      cb(fs.createReadStream(join(rootPath, 'assets', url.hostname, url.pathname)))
    })
  }

  // eslint-disable-next-line no-console
  ipcMain.on('sayHello', (e, message) => console.log(e.sender.id, message))

  session.defaultSession.setPreloads([
    resolvePreload('test1'),
  ])

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

gotSingleInstanceLock
  .then(beforeReady)
  .then(app.whenReady)
  .then(afterReady)
  .catch(console.error)
  .catch(process.exit.bind(process, -1))

if (!app.hasSingleInstanceLock()) {
  const singleInstanceLock = app.requestSingleInstanceLock()

  if (singleInstanceLock)
    getSingleInstanceLock.fire()
  else
    app.quit()
}

