import { join } from 'node:path'
import { dev } from 'eevi-is'
import { preloadsPath } from './paths'

const isMpa = process.env.MODE === 'mpa'

export const resolvePages = (page?: string) => {
  if (dev() && process.env.URL.startsWith('http'))
    return isMpa ? new URL(`pages/${page ?? 'main'}/`, process.env.URL).toString() : process.env.URL

  return isMpa ? new URL(`pages/${page}/index.html`, `natmri://page/${__dirname}`).toString() : new URL(process.env.URL, `file:///${__dirname}`).toString()
}

export function resolvePreload(name: string) {
  name = name.endsWith('.js') ? name : `${name}.js`
  return join(preloadsPath, name)
}
