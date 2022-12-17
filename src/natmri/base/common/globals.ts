import type { IpcRenderer } from 'typings/electron'
import type { Process } from 'typings/process'

declare let safeProcess: Process
declare let safeIpcRenderer: IpcRenderer

// native environment
if (typeof global !== 'undefined') {
  safeProcess = global.process
  // eslint-disable-next-line @typescript-eslint/no-var-requires
  safeIpcRenderer = require('electron').ipcRenderer
}

export const process = safeProcess
export const ipcRenderer = safeIpcRenderer
