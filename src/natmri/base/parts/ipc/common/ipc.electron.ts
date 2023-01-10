/* ---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *-------------------------------------------------------------------------------------------- */

import type { VSBuffer } from 'natmri/base/common/buffer'
import type { Event } from 'natmri/base/common/event'
import type { IMessagePassingProtocol } from 'natmri/base/parts/ipc/common/ipc'

export interface Sender {
  send(channel: string, msg: unknown): void
}

/**
 * The Electron `Protocol` leverages Electron style IPC communication (`ipcRenderer`, `ipcMain`)
 * for the implementation of the `IMessagePassingProtocol`. That style of API requires a channel
 * name for sending data.
 */
export class Protocol implements IMessagePassingProtocol {
  constructor(private sender: Sender, readonly onMessage: Event<VSBuffer>) { }

  send(message: VSBuffer): void {
    try {
      this.sender.send('natmri:message', message.buffer)
    }
    catch (e) {
      // systems are going down
    }
  }

  disconnect(): void {
    this.sender.send('natmri:disconnect', null)
  }
}
