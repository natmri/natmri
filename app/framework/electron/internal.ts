import { InstantiationService, ServiceCollection } from '@livemoe/core'

export const SERVICE_COLLECTION = new ServiceCollection()
export const INSTANTIATION_SERVICE = new InstantiationService(SERVICE_COLLECTION)
