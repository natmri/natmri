import { FILENAME_RE } from './constants'

export function filename(path: string) {
  return path.match(FILENAME_RE)?.[2]
}
