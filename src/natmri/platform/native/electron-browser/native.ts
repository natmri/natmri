import { createDecorator } from 'natmri/base/common/instantiation'
import type { ICommonNativeHostService } from 'natmri/platform/native/common/native'

export const INativeHostService = createDecorator<INativeHostService>('nativeHostService')

export interface INativeHostService extends ICommonNativeHostService {}
