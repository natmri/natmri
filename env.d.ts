import type { PublishPolicy } from 'electron-builder'

declare global {
  namespace NodeJS {
    export interface ProcessEnv {
      BUILDER__PUBLISH?: PublishPolicy
    }
  }
}

export {}
