import i18next from 'i18next'
import { isDevelopment } from 'natmri/base/common/environment'

i18next.init({
  lng: 'cn',
  debug: isDevelopment,
  resources: {
  },
})
