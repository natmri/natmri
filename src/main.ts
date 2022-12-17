import { Menu, app, protocol } from 'electron'
import { Schemas } from 'natmri/base/common/network'
import { Application } from 'natmri/entry/electron-main/application'

app.once('ready', onReady)

function onReady() {
  Application
    .createApplication()
    .catch((error) => {
      console.error(error.message)
      process.exit(-1)
    })
}

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
  {
    scheme: Schemas.ws,
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

// Disable default menu (https://github.com/electron/electron/issues/35512)
Menu.setApplicationMenu(null)

/* Following features are disabled from the runtime.
   * `CalculateNativeWinOcclusion` - Disable native window occlusion tracker,
   * Refs https://groups.google.com/a/chromium.org/g/embedder-dev/c/ZF3uHHyWLKw/m/VDN2hDXMAAAJ
   */
app.commandLine.appendSwitch('disable-features', 'CalculateNativeWinOcclusion')

/* Following features are enabled from the runtime.
 * `AutoDisableAccessibility` - https://github.com/microsoft/vscode/issues/162331#issue-1390744354
 */
app.commandLine.appendSwitch('enable-features', 'AutoDisableAccessibility')
