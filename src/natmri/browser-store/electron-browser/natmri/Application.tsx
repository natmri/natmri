import ReactDOM from 'react-dom/client'
import { Counter } from 'natmri/base/browser/react/components/Counter'
import 'uno.css'

export function App() {
  const getIconsUrl = (name: string) => {
    return `natmri://assets/icons/${name}`
  }

  return <>
    <div text-xl>
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

const app = ReactDOM.createRoot(document.getElementById('app')!)

app.render(<App />)
