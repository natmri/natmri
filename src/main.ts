import { Menu, app, protocol } from 'electron'
import { Schemas } from 'natmri/base/common/network'
import { minimist } from 'natmri/base/node/minimist'
import { Main } from 'natmri/store/electron-main/main'

const args = parseArgs()
const gotTheLock = app.requestSingleInstanceLock()

if (!gotTheLock)
  app.quit()

app.once('ready', () => {
  if (args.trace) {
    const contentTracing = require('electron').contentTracing

    const traceOptions = {
      categoryFilter: args['trace-category-filter'] || '*',
      traceOptions: args['trace-options'] || 'record-until-full,enable-sampling',
    }

    contentTracing.startRecording(traceOptions)
      .finally(() => onReady())
  }
  else {
    onReady()
  }
})

function onReady() {
  new Main().main()
}

// register privileged schema
protocol.registerSchemesAsPrivileged([
  {
    scheme: Schemas.natmri,
    privileges: {
      secure: true,
      standard: true,
      stream: true,
      supportFetchAPI: true,
      corsEnabled: true,
      allowServiceWorkers: true,
    },
  },
])

/**
 * Disable blocking 3d api, avoid 3d wallpaper not work
 */
// app.disableDomainBlockingFor3DAPIs()

// Disable default menu (https://github.com/electron/electron/issues/35512)
Menu.setApplicationMenu(null)

/**
  * Following features are disabled from the runtime.
  * `CalculateNativeWinOcclusion` - Disable native window occlusion tracker,
  * Refs https://groups.google.com/a/chromium.org/g/embedder-dev/c/ZF3uHHyWLKw/m/VDN2hDXMAAAJ
  */
app.commandLine.appendSwitch('disable-features', 'CalculateNativeWinOcclusion')

/**
  * Following features are enabled from the runtime.
  * `AutoDisableAccessibility` - https://github.com/microsoft/vscode/issues/162331#issue-1390744354
  */
app.commandLine.appendSwitch('enable-features', 'AutoDisableAccessibility')

/**
 * Force high performance gpu
 */
app.commandLine.appendSwitch('--force_high_performance_gpu')

/**
 * [DEV ENV] source map support for node
 */
if (process.env.NATMRI_DEV)
  require('source-map-support').install()

function parseArgs() {
  return minimist(process.argv, {
    string: [
      'user-data-dir',
      'locale',
    ],
  })
}
