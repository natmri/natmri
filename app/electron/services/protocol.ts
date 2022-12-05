import { createDecorator } from '@livemoe/core'

export interface IProtocolService {

}

export const IProtocolService = createDecorator<IProtocolService>('IProtocolService')

export class ProtocolService implements IProtocolService {

}
