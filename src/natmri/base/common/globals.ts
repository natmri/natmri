/* eslint-disable ts/no-require-imports */

/* eslint-disable node/prefer-global/process */
/* eslint-disable ts/no-var-requires */

import type { IIpcMessagePort, IpcRenderer } from 'typings/electron'
import type { IpcRendererEvent } from 'electron'
import type { Process } from 'typings/process'

declare let safeProcess: Process
declare let safeIpcRenderer: IpcRenderer
declare let safeIpcMessagePort: IIpcMessagePort
const _globals: any = {
  init: false,
}

// native environment
if (typeof globalThis !== 'undefined' && typeof window === 'undefined' && !_globals.init) {
  _globals.safeProcess = globalThis.process
  _globals.safeIpcRenderer = require('electron').ipcRenderer
  _globals.safeIpcMessagePort = undefined
  _globals.init = true
}

// preload environment
if (typeof navigator !== 'undefined' && typeof require !== 'undefined' && !_globals.init) {
  _globals.safeProcess = require('node:process')
  const ipcRenderer = require('electron').ipcRenderer
  _globals.safeIpcRenderer = ipcRenderer
  _globals.safeIpcMessagePort = {
    acquire(responseChannel: string, nonce: string) {
      const responseListener = (e: IpcRendererEvent, responseNonce: string) => {
        // validate that the nonce from the response is the same
        // as when requested. and if so, use `postMessage` to
        // send the `MessagePort` safely over, even when context
        // isolation is enabled
        if (nonce === responseNonce) {
          ipcRenderer.off(responseChannel, responseListener)
          window.postMessage(nonce, '*', e.ports)
        }
      }

      // handle reply from main
      ipcRenderer.on(responseChannel, responseListener)
    },
  }

  _globals.init = true
}

// web environment
if (!_globals.init) {
  _globals.safeProcess = safeProcess
  _globals.safeIpcRenderer = safeIpcRenderer
  _globals.safeIpcMessagePort = safeIpcMessagePort
  _globals.init = true
}

export const process: Process = _globals.safeProcess
export const ipcRenderer: IpcRenderer = _globals.safeIpcRenderer
export const ipcMessagePort: IIpcMessagePort = _globals.safeIpcMessagePort
