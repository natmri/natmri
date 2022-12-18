import { defineConfig, presetAttributify, presetIcons, presetUno } from 'unocss'
import transformerAttributifyJsx from '@unocss/transformer-attributify-jsx'

export default defineConfig({
  presets: [
    presetUno(),
    presetAttributify(),
    presetIcons(),
  ],
  transformers: [
    transformerAttributifyJsx(),
  ],
})
