// @ts-check
import withNuxt from './.nuxt/eslint.config.mjs'

export default withNuxt({
  rules: {
    'vue/no-multiple-template-root': 'off',
    'vue/max-attributes-per-line': ['error', {
      singleline: 3, // each prop on its own line
      multiline: 1 // also applies to multi-line elements
    }]
  }
})
