/// <reference types="vite/client" />

declare global {
  namespace NodeJS {
    export interface ProcessEnv {
      ELECTRON_RENDERER_URL?: string
    }
  }
}

export {}
