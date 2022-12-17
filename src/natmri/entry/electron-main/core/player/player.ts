import type { IPlayer, IPlayerController, IPlayerUI } from 'typings/player'
import type { PlayerLoader } from './loader/player'

export abstract class Player<T> implements IPlayer<T> {
  abstract loader: PlayerLoader<T>
  abstract controller: IPlayerController
  abstract ui: IPlayerUI
}
