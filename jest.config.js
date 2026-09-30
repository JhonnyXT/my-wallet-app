/** @type {import('jest').Config} */
module.exports = {
  transform: {
    "^.+\\.tsx?$": "babel-jest",
  },
  testMatch: ["**/*.test.ts"],
  moduleNameMapper: {
    "^@/(.*)$": "<rootDir>/$1",
    "^expo-crypto$": "<rootDir>/jest/expoCryptoMock.js",
  },
  testPathIgnorePatterns: ["<rootDir>/node_modules/", "<rootDir>/android/", "<rootDir>/.expo/", "<rootDir>/landing/"],
};
