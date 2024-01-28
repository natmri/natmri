import { createApp } from 'vue'
import App from './natmri-store-app.vue'
import 'natmri/store/reset.tailwind.css'
import 'virtual:uno.css'

const app = createApp(App)

app.mount(document.getElementById('app')!)
