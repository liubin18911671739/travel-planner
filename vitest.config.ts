import path from 'node:path'

export default {
  test: {
    environment: 'node',
    setupFiles: ['tests/setup.ts'],
    clearMocks: true,
    restoreMocks: true,
    globals: true,
  },
  resolve: {
    alias: {
      '@': path.resolve(__dirname, '.'),
    },
  },
}
