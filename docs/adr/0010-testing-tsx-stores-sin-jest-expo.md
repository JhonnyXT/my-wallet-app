# 0010 — Testing de componentes `.tsx` y stores: sin `jest-expo`, sin mock de `expo-sqlite`

**Fecha:** 2026-11-18.

## Contexto

La deuda técnica documentada en `AGENTS.md` pedía definir cómo testear componentes `.tsx`,
stores Zustand "con efectos" (persistidos, con lógica más allá de setters puros) y `src/db/`
(SQLite) — hasta ahora Jest solo cubría utilidades puras y `notificationParser`, sin preset de
React Native ni mocks de módulos nativos.

## Problema / Decisión

### Por qué no `jest-expo`

`jest-expo` es el preset recomendado por Expo, pero ninguna versión instalable sirve con esta
combinación exacta de dependencias (`react-native@0.83.2`, `jest@^30.4.2`):

- Las versiones de `jest-expo` compatibles con React Native 0.83 (hasta la línea `57.x`, que
  todavía cae al viejo `react-native/jest-preset.js` si no encuentra `@react-native/jest-preset`)
  traen pineadas sus propias `babel-jest`/`jest-mock`/`jest-snapshot` en `^29.x` — al convivir
  con el `jest-runtime@30.4.2` del proyecto, un `jest-mock@29` sin `clearMocksOnScope` (método
  nuevo de Jest 30) revienta cualquier test con `TypeError: this._moduleMocker.clearMocksOnScope
  is not a function`.
- La primera versión de `jest-expo` con dependencias en `^30.x` (`58.0.0+`) en cambio **exige**
  el paquete `@react-native/jest-preset`, que React Native empezó a publicar recién en la
  `0.85.0` — no existe para la `0.83.2` de este proyecto, y falla con `Cannot find module
  '@react-native/jest-preset/package.json'`.

No hay una versión de `jest-expo` que sirva sin bajar `jest` a `^29` (afecta a toda la suite
existente, 300+ tests) o subir `react-native` (fuera de alcance, no es lo que pidió esta tarea).

### La solución: el preset `react-native` a secas + un override puntual

`jest.config.js` usa `preset: "react-native"` (el que trae el propio paquete `react-native`,
sin intermediarios) en vez de `jest-expo`. Ese preset por sí solo también choca contra Jest 30,
pero por una sola razón puntual: `react-native/jest-preset.js` apunta su `testEnvironment` a
`react-native/jest/react-native-env.js`, que extiende `jest-environment-node` — y React Native
0.83.2 declara esa dependencia en `^29.7.0` en su propio `package.json`.

Se agregó un `overrides` en el `package.json` raíz (mismo mecanismo que ya usa el proyecto para
parches de seguridad de `npm audit`):
```json
"overrides": { "jest-environment-node": "$jest" }
```
Eso fuerza esa única dependencia anidada a la misma versión que el `jest` del proyecto
(`^30.4.2`), sin tocar nada más del árbol de `react-native`. Con eso, los 3 problemas (choque de
`jest-mock`, falta de `@react-native/jest-preset`, y el mismatch de `jest-environment-node`)
quedan resueltos sin bajar la versión de Jest del proyecto.

`jest/setupMocks.js` (cargado vía `setupFiles` en `jest.config.js`) mockea:
- `@react-native-async-storage/async-storage` → el mock oficial del paquete
  (`@react-native-async-storage/async-storage/jest/async-storage-mock`), en memoria.
- `react-native-worklets` → su mock oficial (`react-native-worklets/lib/module/mock`, sin
  export `/mock` declarado en el `package.json` del paquete, hay que apuntar al archivo real).
- `react-native-reanimated` → su mock oficial (`react-native-reanimated/mock`), que en Reanimated
  4 depende a su vez de `react-native-worklets` estar mockeado (si no, intenta inicializar la
  parte nativa de verdad y explota con `WorkletsError`). El mock oficial todavía no implementa
  `useReducedMotion` (literal `// ADD ME IF NEEDED` en su código) — se le agrega a mano,
  devolviendo `false` (sin reducir movimiento), consistente con que el resto del mock tampoco
  desactiva animaciones por defecto.

`jest.config.js` también necesitó ampliar `transformIgnorePatterns`: el patrón del preset de
React Native solo transpila paquetes que *empiezan* `react-native/` o `@react-native/` — paquetes
con el guion pegado (`react-native-reanimated`, `react-native-worklets`, `lucide-react-native`)
quedan excluidos por default y hay que agregarlos a mano o Jest no puede parsear su ESM.

### Por qué `src/db/` (SQLite) sigue sin mock propio

Un mock de `expo-sqlite` que imite fielmente el motor real (transacciones, WAL, el comportamiento
exacto de los `UPDATE`/`INSERT` con los índices y `LIST_SCOPE_SQL`) es alto esfuerzo y alto
riesgo de divergir del comportamiento real sin que nadie lo note — exactamente el tipo de falso
positivo que esta deuda técnica buscaba evitar. `src/db/listScope.test.ts` ya cubre estáticamente
el único invariante realmente crítico (ninguna lectura de `transactions` se salta
`LIST_SCOPE_SQL`); el resto del CRUD de `db.ts` se sigue verificando en dispositivo real (como ya
indicaba `AGENTS.md` para cualquier test que toque `src/db/` transitivamente: mockear solo la
función puntual usada, nunca arrastrar `expo-sqlite`).

## Consecuencias

- Instalar `@testing-library/react-native` fijo en `13.3.3`, no `latest` (`14.x` exige Node ≥22;
  el proyecto declara Node ≥20 en `AGENTS.md` y corre en Node 20 en este entorno).
- Cualquier bump futuro de `react-native` a `0.85+` debería reevaluar si ya conviene volver a
  `jest-expo` (su versión `58.x`+ depende de `@react-native/jest-preset`, que recién existe desde
  ahí) y si el `overrides` de `jest-environment-node` sigue haciendo falta.
- Un componente nuevo que use Reanimated o AsyncStorage no necesita mockear nada aparte — ya es
  global vía `jest/setupMocks.js`. Un paquete RN nuevo con ESM sin transpilar (error "Cannot use
  import statement outside a module") necesita sumarse a `transformIgnorePatterns`.
- No reintentar mockear `expo-sqlite` para probar `db.ts` directamente sin una razón de peso
  nueva — la decisión fue dejarlo fuera a propósito, no por falta de tiempo.

Código: `jest.config.js`, `jest/setupMocks.js`, `package.json` → `overrides`.
