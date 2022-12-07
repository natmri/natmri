/**
 * The player consists of controller, a resource loader and user interface.
 */

import type { BrowserWindow } from 'electron'
import type { IRepository } from '@app/compat-common'

/**
 * load resource form repository
 */
export interface IPlayerLoader<T> {
  repositories: IRepository[]

  get(name?: string): T[]
  set(name?: string): T
  clean(name?: string): void
}

export interface IPlayerController {
  play(): void
  pause(): void

}

export interface IPlayer<T> {
  loader: IPlayerLoader<T>
  controller: IPlayerController
  ui: BrowserWindow
}

