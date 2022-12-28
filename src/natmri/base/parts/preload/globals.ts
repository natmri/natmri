import { contextBridge, ipcRenderer } from 'electron'
import type { IpcRenderer } from 'typings/electron'
import type { Process } from 'typings/process'

const SecureSyncChannel = new Set([

] as readonly string[])

const safeProcess: Process = {
  type: 'sandboxed-browser',
  arch: process.arch,
  sandboxed: process.sandboxed,
  contextIsolated: process.contextIsolated,
  mas: process.mas,
  windowsStore: process.windowsStore,
  cwd: () => process.cwd(),
  env: { ...(process?.env ?? {}) } as any,
  version: process.version,
  versions: { ...process.versions },
  platform: process.platform,
  resourcesPath: process.resourcesPath,
  cpuUsage: (previousValue?: NodeJS.CpuUsage) => process.cpuUsage(previousValue),
  resourceUsage: () => process.resourceUsage(),
}

const safeIpcRenderer: IpcRenderer = {
  on(channel, callback) {
    return ipcRenderer.on(channel, callback)
  },
  once(channel, callback) {
    return ipcRenderer.once(channel, callback)
  },
  invoke(channel, ...args) {
    return ipcRenderer.invoke(channel, ...args)
  },
  removeListener(channel, listener) {
    return ipcRenderer.removeListener(channel, listener)
  },
  send(channel, ...args) {
    return ipcRenderer.send(channel, ...args)
  },
  sendSync(channel, ...args) {
    if (SecureSyncChannel.has(channel))
      return ipcRenderer.send(channel, ...args)
  },
}

contextBridge.exposeInMainWorld('safeProcess', safeProcess)
contextBridge.exposeInMainWorld('safeIpcRenderer', safeIpcRenderer)
