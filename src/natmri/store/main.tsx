import { render } from 'solid-js/web'
import { App } from './Application'
import 'natmri/store/reset.tailwind.css'
import 'virtual:uno.css'

render(App, document.getElementById('app')!)
