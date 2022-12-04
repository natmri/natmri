import { resolve } from 'path'
import type { ElectronApplication } from 'playwright'
import { _electron as electron } from 'playwright'

let electronApplication: ElectronApplication

beforeAll(async () => {
  process.env.PLAYWRIGHT = 'true'
  electronApplication = await electron.launch({
    args: [resolve(process.cwd(), 'release', 'app', 'dist', 'main.js')],
    cwd: resolve(process.cwd(), 'release', 'app'),
    env: process.env,
  })
})

afterAll(async () => {
  // may cause e2e error
  await electronApplication.close()
})

test('Main window state', async () => {
  let windowState: { isVisible: boolean; isDevToolsOpened: boolean; isCrashed: boolean } = {
    isVisible: false,
    isDevToolsOpened: false,
    isCrashed: true,
  }
  await electronApplication.firstWindow()
  windowState = await electronApplication.evaluate(({ BrowserWindow }) => {
    const window = BrowserWindow.getAllWindows()[0]

    const getState = () => ({
      isVisible: window.isVisible(),
      isDevToolsOpened: window.webContents.isDevToolsOpened(),
      isCrashed: window.webContents.isCrashed(),
    })

    return new Promise((resolve) => {
      if (window.isVisible())
        resolve(getState())
      else
        window.once('ready-to-show', () => setTimeout(() => resolve(getState()), 0))
    })
  })

  expect(windowState.isCrashed, 'The app has crashed').toBeFalsy()
  expect(windowState.isVisible, 'The main window was not visible').toBeTruthy()
  expect(windowState.isDevToolsOpened, 'The DevTools panel was open').toBeFalsy()
})

test('Main window web content', async () => {
  const page = await electronApplication.firstWindow()

  const element = page.locator('div[id=app]')

  expect(element, 'Was unable to find the root element').toBeTruthy()

  expect((await element.innerHTML()).trim(), 'Window content was empty').not.equal('')
})
