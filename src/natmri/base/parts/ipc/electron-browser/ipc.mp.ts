/* ---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *-------------------------------------------------------------------------------------------- */

import { ipcRenderer } from 'electron'
import { Event } from 'natmri/base/common/event'
import { IPCServer } from 'natmri/base/parts/ipc/common/ipc'
import { Protocol as MessagePortProtocol } from 'natmri/base/parts/ipc/common/ipc.mp'
import type { ClientConnectionEvent } from 'natmri/base/parts/ipc/common/ipc'

/**
 * An implementation of a `IPCServer` on top of MessagePort style IPC communication.
 * The clients register themselves via Electron IPC transfer.
 */
export class Server extends IPCServer {
  private static getOnDidClientConnect(): Event<ClientConnectionEvent> {
    // Clients connect via `natmri:createMessageChannel` to get a
    // `MessagePort` that is ready to be used. For every connection
    // we create a pair of message ports and send it back.
    //
    // The `nonce` is included so that the main side has a chance to
    // correlate the response back to the sender.
    const onCreateMessageChannel = Event.fromNodeEventEmitter<string>(ipcRenderer, 'natmri:createMessageChannel', (_, nonce: string) => nonce)

    return Event.map(onCreateMessageChannel, (nonce) => {
      // Create a new pair of ports and protocol for this connection
      const { port1: incomingPort, port2: outgoingPort } = new MessageChannel()
      const protocol = new MessagePortProtocol(incomingPort)

      const result: ClientConnectionEvent = {
        protocol,
        // Not part of the standard spec, but in Electron we get a `close` event
        // when the other side closes. We can use this to detect disconnects
        // (https://github.com/electron/electron/blob/11-x-y/docs/api/message-port-main.md#event-close)
        onDidClientDisconnect: Event.fromDOMEventEmitter(incomingPort, 'close'),
      }

      // Send one port back to the requestor
      // Note: we intentionally use `electron` APIs here because
      // transferables like the `MessagePort` cannot be transferred
      // over preload scripts when `contextIsolation: true`
      ipcRenderer.postMessage('natmri:createMessageChannelResult', nonce, [outgoingPort])

      return result
    })
  }

  constructor() {
    super(Server.getOnDidClientConnect())
  }
}
