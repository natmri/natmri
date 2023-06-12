/* ---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *-------------------------------------------------------------------------------------------- */

import type { Buffer } from 'node:buffer'
import { ipcMain } from 'electron'
import { VSBuffer } from 'natmri/base/common/buffer'
import { Emitter, Event } from 'natmri/base/common/event'
import { toDisposable } from 'natmri/base/common/lifecycle'
import { Protocol as ElectronProtocol } from 'natmri/base/parts/ipc/common/ipc.electron'
import { IPCServer } from 'natmri/base/parts/ipc/common/ipc'
import type { WebContents } from 'electron'
import type { IDisposable } from 'natmri/base/common/lifecycle'
import type { ClientConnectionEvent } from 'natmri/base/parts/ipc/common/ipc'

interface IIPCEvent {
  event: { sender: WebContents }
  message: Buffer | null
}

function createScopedOnMessageEvent(senderId: number, eventName: string): Event<VSBuffer | null> {
  const onMessage = Event.fromNodeEventEmitter<IIPCEvent>(ipcMain, eventName, (event, message) => ({ event, message }))
  const onMessageFromSender = Event.filter(onMessage, ({ event }) => event.sender.id === senderId)

  return Event.map(onMessageFromSender, ({ message }) => message ? VSBuffer.wrap(message) : message)
}

/**
 * An implementation of `IPCServer` on top of Electron `ipcMain` API.
 */
export class Server extends IPCServer {
  private static readonly Clients = new Map<number, IDisposable>()

  private static getOnDidClientConnect(): Event<ClientConnectionEvent> {
    const onHello = Event.fromNodeEventEmitter<WebContents>(ipcMain, 'natmri:hello', ({ sender }: Electron.IpcMainEvent) => sender)

    return Event.map(onHello, (webContents) => {
      const id = webContents.id
      const client = Server.Clients.get(id)

      client?.dispose()

      const onDidClientReconnect = new Emitter<void>()
      Server.Clients.set(id, toDisposable(() => onDidClientReconnect.fire()))

      const onMessage = createScopedOnMessageEvent(id, 'natmri:message') as Event<VSBuffer>
      const onDidClientDisconnect = Event.any(Event.signal(createScopedOnMessageEvent(id, 'natmri:disconnect')), onDidClientReconnect.event)
      const protocol = new ElectronProtocol(webContents, onMessage)

      return { protocol, onDidClientDisconnect }
    })
  }

  constructor() {
    super(Server.getOnDidClientConnect())
  }
}
