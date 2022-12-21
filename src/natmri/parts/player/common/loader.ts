import type { IPlayerLoader } from 'typings/player'
import type { IRepository } from 'typings/repository'

export abstract class PlayerLoader<T> implements IPlayerLoader<T> {
  repositories: IRepository[] = []

  get(name?: string): T[] {
    throw new Error(`Method not implemented.${name}`)
  }

  set(name?: string): T {
    throw new Error(`Method not implemented.${name}`)
  }

  clean(name?: string): void {
    throw new Error(`Method not implemented.${name}`)
  }
}
