// Mocks globales para tests que renderizan componentes o ejercitan stores persistidos — ver
// convención en AGENTS.md → "Tests". Cargado como `setupFiles` en jest.config.js.

// AsyncStorage (stores persistidos: useNotificationStore, useSettingsStore…) — mock oficial
// del paquete, en memoria por proceso de test (se limpia solo al reiniciar el archivo de test).
jest.mock("@react-native-async-storage/async-storage", () =>
  require("@react-native-async-storage/async-storage/jest/async-storage-mock"),
);

// Reanimated usa código nativo (worklets, UI thread) que no existe bajo Jest — su propio
// paquete trae un mock listo (`react-native-reanimated/mock`), solo hay que activarlo. Sin
// esto, cualquier componente que use Reanimated (PressableScale, RollingNumber, CategoryChart…)
// rompe el render en Jest. Reanimated 4 corre sobre react-native-worklets (su parte nativa de
// verdad): el mock de Reanimated solo no alcanza, también hay que mockear worklets.
jest.mock("react-native-worklets", () => require("react-native-worklets/lib/module/mock"));
jest.mock("react-native-reanimated", () => {
  const mock = require("react-native-reanimated/mock");
  // El mock oficial todavía no implementa useReducedMotion ("ADD ME IF NEEDED" en su código) —
  // lo usan PressableScale/RollingNumber/Enter; false = "sin reducir movimiento" (comportamiento
  // normal), consistente con que el resto del mock tampoco desactiva animaciones por defecto.
  return { ...mock, useReducedMotion: () => false };
});
