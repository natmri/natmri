import { defineBuildConfig } from 'unbuild'

export default defineBuildConfig({
  declaration: true,
  entries: [
    { input: './src/vite', format: 'esm' },
    { input: './src/components/', outDir: 'dist/components' },
  ],
})
