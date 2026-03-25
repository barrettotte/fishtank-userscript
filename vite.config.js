import { defineConfig } from 'vite';
import monkey from 'vite-plugin-monkey';

const monkeyConfig = {
  entry: 'src/entry.js',
  userscript: {
    name: 'fishtank-userscript',
    description: 'UserScript to tweak/add features to fishtank.live (season 5)',
    namespace: 'http://tampermonkey.net/',
    version: '5.0.3',
    author: 'barrettotte',
    license: 'MIT',
    match: [
      '*://www.fishtank.live/*',
      '*://classic.fishtank.live/*',
    ],
    'run-at': 'document-idle',
    grant: 'none',
  },
  build: {
    minifyCss: true,
  },
};

const baseUrl = 'https://raw.githubusercontent.com/barrettotte/' +
  'fishtank-userscript/master/dist';

export default defineConfig(({ mode }) => {
  const isUnminified = mode === 'unminified';
  const fileName = isUnminified ? 'main.js' : 'main.min.js';

  return {
    define: {
      __TEST_MODE__: mode === 'testing',
    },
    plugins: [
      monkey({
        ...monkeyConfig,
        userscript: {
          ...monkeyConfig.userscript,
          updateURL: `${baseUrl}/${fileName}`,
          downloadURL: `${baseUrl}/${fileName}`,
        },
        build: {
          ...monkeyConfig.build,
          fileName,
        },
      }),
    ],
    build: {
      outDir: 'dist',
      emptyOutDir: !isUnminified,
      minify: isUnminified ? false : 'terser',
      terserOptions: isUnminified ? undefined : {
        format: { comments: false },
      },
    },
  };
});
