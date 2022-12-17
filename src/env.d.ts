declare global {
  namespace NodeJS {
    export interface ProcessEnv {
      MODE: 'mpa' | 'spa'
      URL: string
    }
  }
}

export {}
