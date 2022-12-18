import ReactDOM from 'react-dom/client'
import { production, web } from 'eevi-is'
import { App } from '../App'
import { sum } from '#preload/common'
import { sha256sum } from '#preload/test1'
import 'uno.css'

console.log(web(), production())

console.log('#preload/common sum function', sum(1, 2, 3, 4, 5))

console.log('#preload/test1 sha256 from session preloads', sha256sum('123'))

const app = ReactDOM.createRoot(document.getElementById('app')!)

app.render(<App />)
