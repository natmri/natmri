import type { PublishPolicy } from 'electron-builder'

declare global {
  namespace NodeJS {
    export interface ProcessEnv {
      NATMRI_DEV?: string
      NATMRI_TEST?: string
      NATMRI_MAP?: 'external'
      BUILDER__PUBLISH?: PublishPolicy
    }
  }
}

export {}
