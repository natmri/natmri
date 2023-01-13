/// <reference types="vite/client" />

declare global {
  namespace NodeJS {
    export interface ProcessEnv {
      NATMRI_DEV?: string
      NATMRI_TEST?: string
      URL: string
    }
  }
}

export {}
