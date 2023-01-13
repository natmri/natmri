import { render } from 'solid-js/web'
import { App } from './natmri-store-app'
import 'natmri/store/reset.tailwind.css'
import 'virtual:uno.css'

render(App, document.getElementById('app')!)
