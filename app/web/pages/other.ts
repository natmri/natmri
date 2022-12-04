import { createApp } from 'vue'
import { web } from 'eevi-is'
import AppVue from '../App.vue'
import 'uno.css'

// eslint-disable-next-line no-console
console.log(web())

const app = createApp(AppVue)

app.mount('#app')
