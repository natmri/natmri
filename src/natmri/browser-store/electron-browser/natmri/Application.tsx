import { render } from 'solid-js/web'
import { Counter } from 'natmri/base/browser/components/Counter'
import '../natmri.main.css'
import 'virtual:uno.css'

export function App() {
  const getIconsUrl = (name: string) => {
    return `natmri://assets/icons/${name}`
  }

  return <>
    <div flex flex-col>
      <div relative select-none h="[30px]">
        <div top-0 left-0 bottom-0 right-0 absolute class="drag"></div>
      </div>
    <div text-xl>
      <h2> Natmri - Store </h2>

      <Counter />

      <div flex flex-col>
        <p>getIconsUrl function expample</p>

        <div self-start border rounded-md overflow-hidden p-1 mt-2>
          <img block object-cover src={getIconsUrl('32x32.png')} />
        </div>
      </div>
    </div>
    </div>
  </>
}

render(App, document.getElementById('app')!)
