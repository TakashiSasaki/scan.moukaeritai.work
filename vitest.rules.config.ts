import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    include: ['tests/firestore-rules/**/*.test.ts'],
  },
});
