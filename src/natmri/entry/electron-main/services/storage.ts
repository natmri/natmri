import { createDecorator } from '@livemoe/core'
import { Disposable } from '@livemoe/utils'

export interface IStorage<T> {
  set(key: string, val: T): void
  get(key: string): T
  del(key: string): boolean
  has(key: string): boolean
}

export interface ISqliteStorage {

}

export interface IStorageMainService {

}

export const IStorageMainService = createDecorator<IStorageMainService>('IStoreMainService')

export class StorageMainService extends Disposable implements IStorageMainService {
  constructor() {
    super()
  }
}
