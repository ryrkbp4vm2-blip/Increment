module.exports = {
  preset: 'jest-expo',
  testMatch: ['**/__tests__/**/*.test.ts?(x)'],
  setupFiles: ['./jest.setup.js'],
  clearMocks: true,
};
