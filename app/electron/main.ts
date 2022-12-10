import { Application } from './application'
import { resolvePreload } from './helper/utils'

Application
  .createApplication({
    protocols: [
      {
        name: 'natmri',
        privileges: {
          secure: true,
          standard: true,
          stream: true,
          bypassCSP: true,
          supportFetchAPI: true,
          corsEnabled: true,
        },
      },
    ],
    preloads: [
      resolvePreload('test1'),
    ],
  })
  .catch(console.error)

