import type { URI } from 'natmri/base/common/uri'

export interface IApplicationProfile {
  readonly id: string
  readonly isDefault: boolean
  readonly name: string
  readonly storageHome: URI
}
