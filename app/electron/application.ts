import type { IFrameApplicationConfiguration } from '@app/framework'
import { FrameworkApplication } from '@app/framework'
import type { ParsedArgs } from 'minimist'

export class Application extends FrameworkApplication {
  static async createApplication(options?: IFrameApplicationConfiguration) {
    return new Application(options)
  }

  override onBeforeReady(args: ParsedArgs) {
    // eslint-disable-next-line no-console
    console.log(args)
  }
}
