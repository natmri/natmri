import type { IPlayerController } from 'typings/player'

export abstract class PlayerController implements IPlayerController {
  play(): void {
  }

  pause(): void {
  }
}
