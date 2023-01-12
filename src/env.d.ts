/// <reference types="vite/client" />

declare global {
  namespace NodeJS {
    export interface ProcessEnv {
      NATMRI_DEV: string
      URL: string
    }
  }
}

export {}
