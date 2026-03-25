export default [
  {
    files: ['src/**/*.js'],
    languageOptions: {
      ecmaVersion: 'latest',
      sourceType: 'module',
      globals: {
        // browser globals
        window: 'readonly',
        document: 'readonly',
        console: 'readonly',
        setTimeout: 'readonly',
        clearTimeout: 'readonly',
        setInterval: 'readonly',
        clearInterval: 'readonly',
        requestAnimationFrame: 'readonly',
        fetch: 'readonly',
        localStorage: 'readonly',
        MutationObserver: 'readonly',
        MouseEvent: 'readonly',
        HTMLAudioElement: 'readonly',
        AudioContext: 'readonly',
        // vite define
        __TEST_MODE__: 'readonly',
      },
    },
    rules: {
      // catch real bugs
      'no-undef': 'error',
      'no-unused-vars': ['warn', { argsIgnorePattern: '^_' }],
      'no-dupe-keys': 'error',
      'no-duplicate-case': 'error',
      'no-unreachable': 'error',
      'no-constant-condition': 'warn',
      'no-self-assign': 'error',
      'no-redeclare': 'error',
      'eqeqeq': ['warn', 'always'],

      // minor quality
      'no-var': 'error',
      'prefer-const': 'warn',
      'no-trailing-spaces': 'warn',
      'semi': ['warn', 'always'],
    },
  },
  {
    ignores: ['dist/', 'tmp/', 'node_modules/'],
  },
];
