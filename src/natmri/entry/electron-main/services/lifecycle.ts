import { createDecorator } from '@livemoe/core'
import { Disposable } from '@livemoe/utils'
import { app } from 'electron'

export interface ILifecycleService {
  runInReady(f: () => void): void
}

export const ILifecycleService = createDecorator<ILifecycleService>('ILifecycleService')

export class LifecycleService extends Disposable implements ILifecycleService {
  private $readyListeners: (() => any)[] = []

  constructor() {
    super()

    app.whenReady()
      .then(() => this.$readyListeners.forEach(f => f()))
  }

  runInReady(f: () => void): void {
    this.$readyListeners.push(f)
  }
}
