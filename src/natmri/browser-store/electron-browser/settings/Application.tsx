import { render } from 'solid-js/web'
import { Counter } from 'natmri/base/browser/components/Counter'
import '../natmri.main.css'
import 'virtual:uno.css'

export function App() {
  const getIconsUrl = (name: string) => {
    return `natmri://assets/icons/${name}`
  }

  return <>
    <div text-xl>
      <h2> Natmri - Settings </h2>

      <Counter />

      <div flex flex-col>
        <p>getIconsUrl function expample</p>

        <div self-start border rounded-md overflow-hidden p-1 mt-2>
          <img block object-cover src={getIconsUrl('32x32.png')} />
        </div>
      </div>
    </div>
  </>
}

render(App, document.getElementById('app')!)
