import { dirname, resolve } from 'path'
import { fileURLToPath } from 'url'

if (!global.__dirname) {
  global.__dirname = fileURLToPath(dirname(import.meta.url))
  global.__filename = fileURLToPath(import.meta.url)
}

export const alias: Record<string, string> = {
  natmri: resolve(process.cwd(), './src/natmri'),
}
