import { defineConfig, presetAttributify, presetIcons, presetTypography, presetUno, transformerAttributifyJsx, transformerDirectives } from 'unocss'

export default defineConfig({
  rules: [
    ['region-drag', { '-webkit-app-region': 'drag' }],
    ['region-no', { '-webkit-app-region': 'no-drag' }],
  ],
  shortcuts: {
    'n-btn': 'px-4 py-1 text-sm text-purple-600 font-semibold rounded-full border border-purple-200 hover:text-white hover:bg-purple-600 hover:border-transparent focus:outline-none focus:ring-2 focus:ring-purple-600 focus:ring-offset-2',
  },
  presets: [
    presetUno(),
    presetTypography(),
    presetAttributify(),
    presetIcons(),
  ],
  transformers: [
    transformerDirectives(),
    transformerAttributifyJsx(),
  ],
})
