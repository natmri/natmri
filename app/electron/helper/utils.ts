import { join } from 'path'
import { macOS, windows } from 'eevi-is'
import { preloadsPath, rootPath } from './paths'

const isMpa = () => process.env.MODE === 'mpa'

export function resolveIconsPath() {
  if (windows())
    return join(rootPath, 'assets', 'icons', 'icon.ico')
  if (macOS())
    return join(rootPath, 'assets', 'icons', '32x32.png')

  return join(rootPath, 'assets', 'icons', '32x32.png')
}

export const resolvePages = (page?: string) => {
  if (process.env.NODE_ENV === 'development')
    return isMpa() ? new URL(`pages/${page ?? 'main'}/`, process.env.URL).toString() : process.env.URL

  return isMpa() ? new URL(`${process.env.URL}/${page}/index.html`, `file:///${__dirname}`).toString() : new URL(process.env.URL, `file:///${__dirname}`).toString()
}

export function resolvePreload(name: string) {
  name = name.endsWith('.js') ? name : `${name}.js`
  return join(preloadsPath, name)
}
