import { createDecorator } from '@livemoe/core'
import type { IRepository } from 'typings/repository'

export interface NativeParsedArgs {
  locale?: string
  'user-data-dir'?: string
  'self-startup'?: boolean

  // content tracing options
  trace?: boolean
  'trace-category-filter'?: string
  'trace-options'?: string

  // debug params
  'inspect'?: string
  'inspect-brk'?: string
}

export interface IEnvironmentService {

}

export interface INativeEnvironmentService extends IEnvironmentService {
  args: NativeParsedArgs

  resourcePath: string
  repositores: IRepository[]
  platformIconPath: string
  preloadPath: string

  isMpaMode: boolean

  getPagesPath(name: string): string
}

export const IEnvironmentService = createDecorator<IEnvironmentService>('environmentService')
export const INativeEnvironmentService = createDecorator<INativeEnvironmentService>('nativeEnvironmentService')
