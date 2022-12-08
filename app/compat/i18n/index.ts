import { dev } from 'eevi-is'
import i18next from 'i18next'
import en_common from './locales/en/common.json'
import cn_common from './locales/cn/common.json'

i18next.init({
  lng: 'cn',
  debug: dev(),
  resources: {
    en: {
      common: en_common,
    },
    cn: {
      common: cn_common,
    },
  },
})
