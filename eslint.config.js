import antfu from '@antfu/eslint-config'

export default antfu({
  rules: {
    'no-new': 'off',
    'no-tabs': 'off',
    'no-console': 'off',
    'accessor-pairs': 'off',
    'import/no-mutable-exports': 'off',
    'style/no-mixed-operators': 'off',
    'ts/no-this-alias': 'off',
    'ts/no-namespace': 'off',
    'ts/no-redeclare': 'off',
    'ts/no-unsafe-declaration-merging': 'off',
    '@typescript-eslint/no-require-imports': 'off',
  },
  ignores: [
    'node_modules',
    'dist',
    'out',
    'fixtures',
  ],
})
