import { ipcRenderer } from 'natmri/base/common/globals'
import { IPCClient } from 'natmri/base/parts/ipc/common/ipc'
import { Protocol as ElectronProtocol } from 'natmri/base/parts/ipc/common/ipc.electron'
import { Event } from 'natmri/base/common/event'
import { VSBuffer } from 'natmri/base/common/buffer'
import type { IDisposable } from 'natmri/base/common/lifecycle'

export class Client extends IPCClient implements IDisposable {
  private protocol: ElectronProtocol

  private static createProtocol(): ElectronProtocol {
    const onMessage = Event.fromNodeEventEmitter<VSBuffer>(ipcRenderer, 'natmri:message', (_, message) => VSBuffer.wrap(message))
    ipcRenderer.send('natmri:hello')

    return new ElectronProtocol(ipcRenderer, onMessage)
  }

  constructor(id: string) {
    const protocol = Client.createProtocol()
    super(protocol, id)

    this.protocol = protocol
  }

  override dispose(): void {
    this.protocol.disconnect()
  }
}
