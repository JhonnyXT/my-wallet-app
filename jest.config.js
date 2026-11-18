/** @type {import('jest').Config} */
module.exports = {
  preset: "react-native",
  testMatch: ["**/*.test.ts", "**/*.test.tsx"],
  setupFiles: ["react-native/jest/setup.js", "<rootDir>/jest/setupMocks.js"],
  // El preset de react-native solo transpila paquetes que empiezan "react-native/" o
  // "@react-native/" — varios que sí usamos en componentes (reanimated, lucide-react-native)
  // tienen el guion pegado y quedan fuera de ese patrón, así se agregan a mano.
  transformIgnorePatterns: [
    "node_modules/(?!(react-native|@react-native|react-native-reanimated|react-native-worklets|lucide-react-native)/)",
  ],
  moduleNameMapper: {
    "^@/(.*)$": "<rootDir>/$1",
    "^expo-crypto$": "<rootDir>/jest/expoCryptoMock.js",
  },
  testPathIgnorePatterns: ["<rootDir>/node_modules/", "<rootDir>/android/", "<rootDir>/.expo/", "<rootDir>/landing/", "<rootDir>/firestore-tests/"],
};
