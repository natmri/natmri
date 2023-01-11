import { defineConfig, presetAttributify, presetIcons, presetUno } from 'unocss'
import transformerAttributifyJsx from '@unocss/transformer-attributify-jsx'

export default defineConfig({
  rules: [
    ['region-drag', {
      '-webkit-app-region': 'drag',
    }],
    ['region-no', {
      '-webkit-app-region': 'no-drag',
    }],
  ],
  shortcuts: {
    'nti-btn': 'py-1.5 px-4 font-semibold rounded-lg shadow-md',
    'nti-btn-green': 'text-white bg-green-500 hover:bg-green-700',
  },
  presets: [
    presetUno(),
    presetAttributify(),
    presetIcons(),
  ],
  transformers: [
    transformerAttributifyJsx(),
  ],
})
