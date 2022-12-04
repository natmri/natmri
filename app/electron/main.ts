import { join } from 'path'
import fs from 'fs'
import { BrowserWindow, app, ipcMain, protocol, session } from 'electron'
import { dev } from 'eevi-is'
import { Emitter, Event } from '@livemoe/utils'
import minimist from 'minimist'
import { rootPath } from 'helper/paths'
import { resolvePages, resolvePreload } from '~/helper/utils'

const skipArgv = dev() ? 4 : 2
const argv = minimist(process.argv.slice(skipArgv), { boolean: '--' })

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

  win.loadURL(resolvePages('main'))

  win.webContents.openDevTools({ mode: 'detach' })
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

