import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    // Test environment
    environment: 'node',

    // Include patterns
    include: ['tests/**/*.test.ts'],

    // Exclude patterns
    exclude: ['node_modules', 'dist', 'build'],

    // Coverage configuration
    coverage: {
      provider: 'v8',
      reporter: ['text', 'json', 'html'],
      exclude: [
        'node_modules/',
        'dist/',
        'tests/',
        '**/*.test.ts',
        '**/*.spec.ts',
        '**/index.ts', // Entry point, hard to test
        'vitest.config.ts',
      ],
      // Coverage thresholds (adjusted for minimal testing strategy)
      // Only utils/* are tested, so we set realistic thresholds
      thresholds: {
        lines: 20,
        functions: 20,
        branches: 20,
        statements: 20,
      },
    },

    // Global test timeout
    testTimeout: 10000,

    // Show detailed test results
    reporters: ['verbose'],
  },
});
