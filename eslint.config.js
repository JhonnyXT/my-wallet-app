const expoConfig = require("eslint-config-expo/flat");
const eslintConfigPrettier = require("eslint-config-prettier");
const { defineConfig, globalIgnores } = require("eslint/config");

module.exports = defineConfig([
  globalIgnores(["android/**", "ios/**", ".expo/**", "specs/**", "coverage/**", "node_modules/**", "landing/**"]),
  ...expoConfig,
  {
    rules: {
      // react/no-unescaped-entities protege contra HTML mal formado en React DOM
      // (web). React Native no renderiza HTML — <Text>"{desc}"</Text> es texto
      // plano válido, sin ningún riesgo real. Forzar &quot; en +10 lugares de
      // copy en español solo restaría legibilidad sin ganar nada.
      "react/no-unescaped-entities": "off",
    },
  },
  {
    // jest/*.js son helpers de setup para jest.config.js (ej. jest.mock() a nivel de módulo),
    // no archivos *.test.ts — no caen en el matcher de test files de eslint-config-expo que ya
    // define los globals de Jest.
    files: ["jest/**/*.js"],
    languageOptions: {
      globals: { jest: "readonly" },
    },
  },
  // Desactiva las reglas de estilo de ESLint que compiten con Prettier —
  // Prettier es la única fuente de verdad para formato (comillas, indentación,
  // punto y coma, etc.), ESLint solo para correctitud.
  eslintConfigPrettier,
]);
