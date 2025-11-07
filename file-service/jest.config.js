export default {
  testEnvironment: 'node',
  coverageDirectory: 'coverage',
  collectCoverageFrom: [
    'src/**/*.js',
    '!src/app.js'
  ],
  testMatch: [
    '**/test/**/*.test.js'
  ],
  transform: {}
};
