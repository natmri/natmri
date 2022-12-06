import type { ServiceIdentifier } from '@livemoe/core'
import { SyncDescriptor } from '@livemoe/core'
import { INSTANTIATION_SERVICE, SERVICE_COLLECTION } from './internal'

export function Injectable<T>(identifier: ServiceIdentifier<T>, options?: any) {
  return (target: any) => {
    SERVICE_COLLECTION.set(identifier, options && options.lazy ? target : new SyncDescriptor<T>(target))
  }
}

export function Module() {
  return (target: any) => {
    INSTANTIATION_SERVICE.createInstance(target)
  }
}
