import { ipcRenderer } from 'electron'

export function sayHello() {
  ipcRenderer.send('sayHello', 'hello')
}

export function sum(...nums: number[]) {
  let s = 0
  for (const num of nums)
    s += num
  return s
}
