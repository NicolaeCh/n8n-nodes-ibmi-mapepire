import { defineConfig } from 'eslint/config';

export default defineConfig([
  {
    ignores: [
      'dist/**',
      '.test-dist/**',
      'node_modules/**',
      'tools/type-stubs/**',
    ],
  },
]);
