import { createDecorator } from '@livemoe/core'

export interface ITrayService {

}

export const ITrayService = createDecorator<ITrayService>('ITrayService')

export class TrayService implements ITrayService {

}
