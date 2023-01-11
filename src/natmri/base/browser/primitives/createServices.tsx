import { InstantiationService, ServiceCollection, SyncDescriptor } from 'natmri/base/common/instantiation'
import { IMainProcessService, MainProcessService } from 'natmri/platform/ipc/electron-browser/mainProcessService'
import { INativeHostService } from 'natmri/platform/native/electron-browser/native'
import { NativeHostService } from 'natmri/platform/native/electron-browser/nativeHostService'
import type { ServiceIdentifier } from 'natmri/base/common/instantiation'

const services = new ServiceCollection()
services.set(IMainProcessService, new SyncDescriptor(MainProcessService))
services.set(INativeHostService, new SyncDescriptor(NativeHostService))
const instantiationService = new InstantiationService(services, true)

export function createService<T>(serviceIdentifier: ServiceIdentifier<T>) {
  return instantiationService.invokeFunction(accessor => accessor.get(serviceIdentifier))
}
