/// <reference types='vitest' />
import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import { nxViteTsPaths } from '@nx/vite/plugins/nx-tsconfig-paths.plugin';
import { nxCopyAssetsPlugin } from '@nx/vite/plugins/nx-copy-assets.plugin';
import { nodePolyfills } from 'vite-plugin-node-polyfills';
import path from 'path';

const cip8 = path.join(
  __dirname,
  '../../node_modules',
  '@cardano-sdk/key-management/dist/esm/cip8/index.js'
);
console.log(cip8);

export default defineConfig({
  root: __dirname,
  cacheDir: '../../node_modules/.vite/apps/coordination-service-poc',
  server: {
    port: 4200,
    host: 'localhost',
    headers: {
      'Cross-Origin-Opener-Policy': 'same-origin',
      'Cross-Origin-Embedder-Policy': 'require-corp',
    },
  },
  preview: {
    port: 4300,
    host: 'localhost',
  },
  plugins: [
    react(),
    nxViteTsPaths(),
    nxCopyAssetsPlugin(['*.md']),
    nodePolyfills(),
  ],
  resolve: {
    alias: [
      {
        find: '@emurgo/cardano-message-signing-nodejs',
        replacement: '@emurgo/cardano-message-signing-browser',
      },
    ],
  },
  build: {
    outDir: '../../dist/apps/coordination-service-poc',
    emptyOutDir: true,
    reportCompressedSize: true,
    commonjsOptions: {
      transformMixedEsModules: true,
    },
  },
  optimizeDeps: {
    exclude: ['@sqlite.org/sqlite-wasm'],
    esbuildOptions: {
      // Node.js global to browser globalThis
      define: {
        global: 'globalThis',
      },
      // Enable esbuild polyfill plugins
    },
  },
});
