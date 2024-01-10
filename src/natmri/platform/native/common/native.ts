import type { Event } from 'natmri/base/common/event'

export interface IColorScheme {
  readonly dark: boolean
  readonly highContrast: boolean
}

export interface IOSStatistics {
  totalmem: number
  freemem: number
  loadavg: number[]
}

export interface ICPUProperties {
  model: string
  speed: number
}

export interface IOSProperties {
  type: string
  release: string
  arch: string
  platform: string
  cpus: ICPUProperties[]
}

export interface ICommonNativeHostService {
  readonly _serviceBrand: undefined

  readonly onDidChangeDisplay: Event<string[] | undefined>

  // Lifecycle
  notifyReady(windowId: number | undefined): Promise<void>
  relaunch(options?: { addArgs?: string[], removeArgs?: string[] }): Promise<void>
  closeWindow(windowId: number): Promise<void>
  quit(): Promise<void>
  exit(code: number): Promise<void>

  isAdmin(): Promise<boolean>

  // Shell
  openExternal(url: string): Promise<void>

  // OS Properties
  getOSStatistics(): Promise<IOSStatistics>
  getOSProperties(): Promise<IOSProperties>
}
