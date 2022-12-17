import { resolve } from 'path'
import { production } from 'eevi-is'

export const rootPath = production() ? process.resourcesPath : process.cwd()
export const preloadsPath = resolve(__dirname, 'preload')
