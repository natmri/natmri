import { DeferredPromise } from 'natmri/base/common/async'
import { Emitter } from 'natmri/base/common/event'
import { Disposable } from 'natmri/base/common/lifecycle'
import { InMemoryStorageDatabase, Storage, StorageHint, StorageState } from 'natmri/base/parts/storage/common/storage'
import { SQLiteStorageDatabase } from 'natmri/base/parts/storage/node/storage'
import { LogLevel } from 'natmri/platform/log/common/log'
import { join } from 'natmri/base/common/path'
import { IS_NEW_KEY } from 'natmri/platform/storage/common/storage'
import type { Event } from 'natmri/base/common/event'
import type { IDisposable } from 'natmri/base/common/lifecycle'
import type { ISQLiteStorageDatabaseLoggingOptions } from 'natmri/base/parts/storage/node/storage'
import type { ILoggerService } from 'natmri/platform/log/common/log'
import type { IStorage } from 'natmri/base/parts/storage/common/storage'
import type { IApplicationProfile } from 'natmri/platform/profile/common/profile'

export interface IStorageMainOptions {

  /**
	 * If enabled, storage will not persist to disk
	 * but into memory.
	 */
  readonly useInMemoryStorage?: boolean
}

/**
 * Provides access to application, profile and workspace storage from
 * the electron-main side that is the owner of all storage connections.
 */
export interface IStorageMain extends IDisposable {

  /**
	 * Emitted whenever data is updated or deleted.
	 */
  readonly onDidChangeStorage: Event<IStorageChangeEvent>

  /**
	 * Emitted when the storage is closed.
	 */
  readonly onDidCloseStorage: Event<void>

  /**
	 * Access to all cached items of this storage service.
	 */
  readonly items: Map<string, string>

  /**
	 * Allows to join on the `init` call having completed
	 * to be able to safely use the storage.
	 */
  readonly whenInit: Promise<void>

  /**
	 * Provides access to the `IStorage` implementation which will be
	 * in-memory for as long as the storage has not been initialized.
	 */
  readonly storage: IStorage

  /**
	 * The file path of the underlying storage file if any.
	 */
  readonly path: string | undefined

  /**
	 * Required call to ensure the service can be used.
	 */
  init(): Promise<void>

  /**
	 * Retrieve an element stored with the given key from storage. Use
	 * the provided defaultValue if the element is null or undefined.
	 */
  get(key: string, fallbackValue: string): string
  get(key: string, fallbackValue?: string): string | undefined

  /**
	 * Store a string value under the given key to storage. The value will
	 * be converted to a string.
	 */
  set(key: string, value: string | boolean | number | undefined | null): void

  /**
	 * Delete an element stored under the provided key from storage.
	 */
  delete(key: string): void

  /**
	 * Whether the storage is using in-memory persistence or not.
	 */
  isInMemory(): boolean

  /**
	 * Close the storage connection.
	 */
  close(): Promise<void>
}

export interface IStorageChangeEvent {
  readonly key: string
}

abstract class BaseStorageMain extends Disposable implements IStorageMain {
  protected readonly _onDidChangeStorage = this._register(new Emitter<IStorageChangeEvent>())
  readonly onDidChangeStorage = this._onDidChangeStorage.event

  private readonly _onDidCloseStorage = this._register(new Emitter<void>())
  readonly onDidCloseStorage = this._onDidCloseStorage.event

  private _storage = new Storage(new InMemoryStorageDatabase(), { hint: StorageHint.STORAGE_IN_MEMORY }) // storage is in-memory until initialized
  get storage(): IStorage { return this._storage }

  abstract get path(): string | undefined

  private initializePromise: Promise<void> | undefined = undefined

  private readonly whenInitPromise = new DeferredPromise<void>()
  readonly whenInit = this.whenInitPromise.p

  private state = StorageState.None

  constructor(
    protected readonly logService: ILoggerService,
  ) {
    super()
  }

  isInMemory(): boolean {
    return this._storage.isInMemory()
  }

  init(): Promise<void> {
    if (!this.initializePromise) {
      this.initializePromise = (async () => {
        if (this.state !== StorageState.None)
          return // either closed or already initialized

        try {
          // Create storage via subclasses
          const storage = await this.doCreate()

          // Replace our in-memory storage with the real
          // once as soon as possible without awaiting
          // the init call.
          this._storage.dispose()
          this._storage = storage

          // Re-emit storage changes via event
          this._register(storage.onDidChangeStorage(key => this._onDidChangeStorage.fire({ key })))

          // Await storage init
          await this.doInit(storage)

          // Ensure we track wether storage is new or not
          const isNewStorage = storage.getBoolean(IS_NEW_KEY)
          if (isNewStorage === undefined)
            storage.set(IS_NEW_KEY, true)

          else if (isNewStorage)
            storage.set(IS_NEW_KEY, false)
        }
        catch (error) {
          this.logService.error(`[storage main] initialize(): Unable to init storage due to ${error}`)
        }
        finally {
          // Update state
          this.state = StorageState.Initialized

          // Mark init promise as completed
          this.whenInitPromise.complete()
        }
      })()
    }

    return this.initializePromise
  }

  protected createLoggingOptions(): ISQLiteStorageDatabaseLoggingOptions {
    return {
      logTrace: (this.logService.getLevel() === LogLevel.Trace) ? msg => this.logService.trace(msg) : undefined,
      logError: error => this.logService.error(error),
    }
  }

  protected doInit(storage: IStorage): Promise<void> {
    return storage.init()
  }

  protected abstract doCreate(): Promise<Storage>

  get items(): Map<string, string> { return this._storage.items }

  get(key: string, fallbackValue: string): string
  get(key: string, fallbackValue?: string): string | undefined
  get(key: string, fallbackValue?: string): string | undefined {
    return this._storage.get(key, fallbackValue)
  }

  set(key: string, value: string | boolean | number | undefined | null): Promise<void> {
    return this._storage.set(key, value)
  }

  delete(key: string): Promise<void> {
    return this._storage.delete(key)
  }

  async close(): Promise<void> {
    // Measure how long it takes to close storage
    await this.doClose()
    this._onDidCloseStorage.fire()
  }

  private async doClose(): Promise<void> {
    // Ensure we are not accidentally leaving
    // a pending initialized storage behind in
    // case `close()` was called before `init()`
    // finishes.
    if (this.initializePromise)
      await this.initializePromise

    // Update state
    this.state = StorageState.Closed

    // Propagate to storage lib
    await this._storage.close()
  }
}

class BaseProfileAwareStorageMain extends BaseStorageMain {
  private static readonly STORAGE_NAME = 'config.db'

  get path(): string | undefined {
    if (!this.options.useInMemoryStorage)
      return join(this.profile.storageHome.fsPath, BaseProfileAwareStorageMain.STORAGE_NAME)

    return undefined
  }

  constructor(
    private readonly profile: IApplicationProfile,
    private readonly options: IStorageMainOptions,
    logService: ILoggerService,
  ) {
    super(logService)
  }

  protected async doCreate(): Promise<Storage> {
    return new Storage(new SQLiteStorageDatabase(this.path ?? SQLiteStorageDatabase.IN_MEMORY_PATH, {
      logging: this.createLoggingOptions(),
    }), !this.path ? { hint: StorageHint.STORAGE_IN_MEMORY } : undefined)
  }
}

export class ApplicationStorageMain extends BaseProfileAwareStorageMain {
  constructor(
    profile: IApplicationProfile,
    options: IStorageMainOptions,
    logService: ILoggerService,
  ) {
    super(profile, options, logService)
  }
}

export class InMemoryStorageMain extends BaseStorageMain {
  get path(): string | undefined {
    return undefined // in-memory has no path
  }

  protected async doCreate(): Promise<Storage> {
    return new Storage(new InMemoryStorageDatabase(), { hint: StorageHint.STORAGE_IN_MEMORY })
  }
}
