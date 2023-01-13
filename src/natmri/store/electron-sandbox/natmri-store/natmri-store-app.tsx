import { Counter } from 'natmri/base/browser/components/Counter'
import { createEffect } from 'solid-js'
import { createService } from 'natmri/base/browser/primitives/createServices'
import { INativeHostService } from 'natmri/platform/native/electron-browser/native'

export function App() {
  const getIconsUrl = (name: string) => {
    return `natmri://assets/icons/${name}`
  }

  createEffect(async () => {
    console.log(await (createService(INativeHostService).getOSProperties()))
  })

  return <>
    <div flex flex-col>
      <div relative select-none h="[30px]">
        <div top-0 left-0 bottom-0 right-0 absolute region-drag></div>
      </div>
      <div>
        <h2 text-2xl font-bold p-4> Natmri - Store </h2>

        <Counter />

        <div flex flex-col>
          <p>getIconsUrl function expample</p>

          <div self-start border rounded-md overflow-hidden p-1 mt-2>
            <img block object-cover w="[32px]" h="[32px]" src={getIconsUrl('32x32.png')} alt="application icon" />
          </div>
        </div>
      </div>
    </div>
  </>
}
