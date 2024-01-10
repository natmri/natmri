import { join } from 'node:path'
import { defineConfig } from 'vitest/config'
import { srcPath as root } from './scripts/utils'

export default defineConfig({
  resolve: {
    alias: [
      {
        find: 'natmri',
        replacement: join(root, 'natmri'),
      },
    ],
  },
})
