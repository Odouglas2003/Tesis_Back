// .eslintrc.js

module.exports = {
  env: {
    node: true,
    es2021: true
  },
  extends: [
    'eslint:recommended',
    'plugin:import/recommended'
  ],

  parserOptions: {
    ecmaVersion: 'latest', 
    sourceType: 'module'
  },
 

  rules: {
    'no-unused-vars': 'warn',
    'no-console': 'off',
    'import/no-unresolved': ['error', { caseSensitive: true }]
  },
  settings: {
    'import/resolver': {
      node: {
        extensions: ['.js', '.jsx', '.ts', '.tsx']
      }
    }
  },
  ignorePatterns: ['node_modules/', 'dist/']
};