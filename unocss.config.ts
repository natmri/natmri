import { defineConfig, presetAttributify, presetIcons, presetTypography, presetUno, transformerDirectives } from 'unocss'

export default defineConfig({
  rules: [
    ['region-drag', { '-webkit-app-region': 'drag' }],
    ['region-no', { '-webkit-app-region': 'no-drag' }],
  ],
  shortcuts: {
    'n-btn': 'px-4 py-1 text-sm font-semibold rounded-full border border-purple-200 hover:text-white hover:bg-purple-600 hover:border-transparent focus:outline-none focus:ring-2 focus:ring-purple-600 focus:ring-offset-2',
    'n-btn-primary': 'n-btn bg-purple-600 border-transparent hover:bg-purple-700 focus:ring-purple-500',
    'n-btn-danger': 'n-btn bg-red-600 border-transparent hover:bg-red-700 focus:ring-red-500',
    'n-btn-success': 'n-btn bg-green-600 border-transparent hover:bg-green-700 focus:ring-green-500',
    'n-btn-warning': 'n-btn bg-yellow-600 border-transparent hover:bg-yellow-700 focus:ring-yellow-500',
    'n-btn-info': 'n-btn bg-blue-600 border-transparent hover:bg-blue-700 focus:ring-blue-500',
    'n-btn-link': 'n-btn bg-transparent border-transparent hover:bg-transparent focus:ring-transparent',

    'n-card': 'bg-white border border-gray-200 rounded-lg shadow',
    'n-card-header': 'p-4 border-b border-gray-200',
    'n-card-body': 'p-4',

  },
  presets: [
    presetUno(),
    presetTypography(),
    presetAttributify(),
    presetIcons(),
  ],
  transformers: [
    transformerDirectives(),
  ],
})
