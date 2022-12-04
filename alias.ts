import { dirname, resolve } from 'path'
import { fileURLToPath } from 'url'

if (!global.__dirname) {
  global.__dirname = fileURLToPath(dirname(import.meta.url))
  global.__filename = fileURLToPath(import.meta.url)
}

const r = (...paths: string[]) => resolve(__dirname, 'packages', ...paths)

export const alias: Record<string, string> = {
  '@starter/shared': r('shared', 'index.ts'),
  '@starter/helper': r('helper', 'index.ts'),
}
