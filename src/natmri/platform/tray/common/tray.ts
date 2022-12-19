import { createDecorator } from '@livemoe/core'

export interface ITrayService {

}

export interface INativeTrayService extends ITrayService {

}

export const ITrayService = createDecorator<ITrayService>('trayService')
export const INativeTrayService = createDecorator<INativeTrayService>('nativeService')
