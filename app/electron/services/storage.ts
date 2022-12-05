export interface IStorage<T> {
  set(key: string, val: T): void
  get(key: string): T
  del(key: string): boolean
  has(key: string): boolean
}

export interface ISqliteStorage {

}
