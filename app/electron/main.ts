import { Application } from './application'

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
  })
  .catch(console.error)

