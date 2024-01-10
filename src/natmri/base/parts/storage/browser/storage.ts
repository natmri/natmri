import { Event } from 'natmri/base/common/event'
import { parse } from 'natmri/base/common/marshalling'
import type { IStorageDatabase, IStorageItemsChangeEvent, IUpdateRequest } from 'natmri/base/parts/storage/common/storage'

export class LocalStorageDatabase implements IStorageDatabase {
  readonly onDidChangeItemsExternal: Event<IStorageItemsChangeEvent> = Event.None

  private readonly items = new Map<string, string>()

  constructor(private readonly ctx: string, private readonly localStorage: Storage) {}

  async getItems(): Promise<Map<string, string>> {
    try {
      const rows: Record<string, string> = parse(this.localStorage.getItem(this.ctx)!)
      for (const [key, value] of Object.entries(rows))
        this.items.set(key, value)
    }
    catch (error) {
      console.error(error)
    }

    return this.items
  }

  async updateItems(request: IUpdateRequest): Promise<void> {
    request.delete?.forEach(key => this.items.delete(key))
    request.insert?.forEach((value, key) => this.items.set(key, value))

    try {
      this.localStorage.setItem(this.ctx, JSON.stringify(Object.fromEntries(this.items)))
    }
    catch (error) {
      console.error(error)
    }
  }

  async optimize(): Promise<void> { }
  async close(): Promise<void> { }
}
