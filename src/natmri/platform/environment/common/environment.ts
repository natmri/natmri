import { createDecorator } from 'natmri/base/common/instantiation'

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

  appRoot: string

  resourcePath: string
  platformIconPath: string
  preloadPath: string

  getPagesPath(name: string): string
}

export const IEnvironmentService = createDecorator<IEnvironmentService>('environmentService')
export const INativeEnvironmentService = createDecorator<INativeEnvironmentService>('nativeEnvironmentService')
