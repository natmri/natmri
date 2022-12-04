import { createApp } from 'vue'
import { web } from 'eevi-is'
import AppVue from '../App.vue'
import { sum } from '#preload/common'
import { sha256sum } from '#preload/test1'
import 'uno.css'

// eslint-disable-next-line no-console
console.log(web())

// eslint-disable-next-line no-console
console.log('#preload/common sum function', sum(1, 2, 3, 4, 5))

// eslint-disable-next-line no-console
console.log('#preload/test1 sha256 from session preloads', sha256sum('123'))

const app = createApp(AppVue)

app.mount('#app')
