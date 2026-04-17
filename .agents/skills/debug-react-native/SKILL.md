---
name: debug-react-native
description: |
  Debugging sistemático por capas para MyWallet (React Native + Expo + SQLite + Zustand).
  Usar cuando haya errores de runtime, la app se crashee, la pantalla esté en blanco,
  los datos no persistan, el build falle, o el APK no se instale. Sigue un checklist
  desde la capa más profunda (SQLite) hasta la más superficial (UI).
license: MIT
metadata:
  project: my-wallet-app
  stack: react-native-expo
---

## When to Use
- La app muestra pantalla blanca o se cierra inesperadamente.
- Los datos no se guardan o no aparecen en la UI.
- Un componente no renderiza o renderiza incorrecto.
- El build de Gradle falla.
- El APK no se instala en el dispositivo.
- Las notificaciones bancarias no se detectan.

## Gotchas
- La app usa `index.js` como entrypoint (no `expo-router/entry`) — si se cambia `package.json`, HeadlessJS se rompe.
- `amount > 0` = gasto, `amount < 0` = ingreso — invertido vs lo convencional.
- Las migraciones SQLite usan `try/catch {}` vacío intencionalmente.
- HeadlessJS corre SIN React — no se pueden usar hooks en `notificationHeadlessTask.ts`.
- `adb` no está en PATH por defecto: usar `C:\Users\FAMILY\AppData\Local\Android\Sdk\platform-tools\adb.exe`.

## Instructions

### Capa 1 — Base de datos (SQLite)

**Síntomas**: datos no aparecen, transacciones perdidas, crash al iniciar.

```bash
# Verificar que initDatabase se ejecuta sin errores
# En app/_layout.tsx, el bootstrap llama:
await initDatabase();      # Crea tabla + migraciones
await loadTransactions();  # Carga todas las transacciones
```

Checklist:
1. ¿`initDatabase()` corre antes que cualquier query? (Verificar `app/_layout.tsx` L42-49)
2. ¿Las migraciones `ALTER TABLE` tienen `try/catch`? (Si no, crash por "duplicate column")
3. ¿Se usa `localISOString()` y no `toISOString()`? (Si no, fechas desfasadas)
4. ¿Los queries usan placeholders `?`? (Si no, posible error de SQL injection o escape)

### Capa 2 — Estado (Zustand)

**Síntomas**: UI no se actualiza, datos stale, estado inconsistente.

```typescript
// Verificar estado imperativo desde consola o log:
console.log(useFinanceStore.getState().transactions.length);
console.log(useSettingsStore.getState().userCategories);
```

Checklist:
1. ¿El store se actualiza después de la operación DB? (`set()` tras `insertTransaction`)
2. ¿Se usa selector específico? (`useStore((s) => s.campo)` en vez de `useStore()`)
3. ¿`useSettingsStore` se rehidrató de AsyncStorage? (Verificar `persist` middleware)
4. ¿Se llama `.getState()` en servicios fuera de React? (hooks no funcionan ahí)

### Capa 3 — Navegación (Expo Router)

**Síntomas**: pantalla no aparece, "route not found", navegación rota.

Checklist:
1. ¿El archivo existe en `app/nombre.tsx`?
2. ¿Está registrado en `app/_layout.tsx` como `<Stack.Screen name="nombre">`?
3. ¿El nombre coincide EXACTAMENTE? (sin `.tsx`, sin `/`)
4. ¿Se usa `router.push("/nombre")` con la barra inicial?
5. ¿Si es modal, tiene `presentation: "fullScreenModal"`?

### Capa 4 — UI y Rendering

**Síntomas**: pantalla blanca, colores incorrectos, layout roto.

Checklist:
1. ¿Se importó `useTheme` de `@/src/context/ThemeContext`? (NO de otro path)
2. ¿`buildStyles(theme)` está envuelto en `useMemo`?
3. ¿Hay `flex: 1` en el contenedor principal?
4. ¿Los colores usan tokens del tema (`t.bg`, `t.text`) y no hex hardcoded?
5. ¿`SafeAreaView` o `paddingTop: insets.top` están aplicados?

### Capa 5 — Build y APK

**Síntomas**: Gradle falla, APK no se instala, crash al abrir en dispositivo.

```powershell
# Build limpio
cd android
.\gradlew clean
.\gradlew assembleRelease

# Si "App not installed":
$adb = "C:\Users\FAMILY\AppData\Local\Android\Sdk\platform-tools\adb.exe"
& $adb devices                    # Verificar que el dispositivo aparece
& $adb uninstall com.mywallet.app # Desinstalar versión anterior
& $adb install -r "android\app\build\outputs\apk\release\app-release.apk"
```

Checklist:
1. ¿`AndroidManifest.xml` tiene `tools:replace="android:allowBackup"`?
2. ¿El keystore es consistente? (release usa debug keystore actualmente)
3. ¿USB debugging está habilitado en el dispositivo?
4. ¿El dispositivo permite instalación desde fuentes desconocidas?

### Capa 6 — Notificaciones bancarias (HeadlessJS)

**Síntomas**: las notificaciones bancarias no se detectan.

Checklist:
1. ¿El permiso de Notification Listener está habilitado? (Ajustes → Notificaciones → Acceso)
2. ¿`package.json` tiene `"main": "index.js"`? (NO `expo-router/entry`)
3. ¿`index.js` registra el HeadlessJS task con el nombre exacto de la librería?
4. ¿`AsyncStorage` tiene `AUTO_DETECT_ENABLED_KEY` en `true`?
5. ¿El packageName del banco está en la lista `ALLOWED_BANKS`?
6. ¿`notificationParser.ts` tiene regex para ese banco?

### Tabla de errores frecuentes

| Error | Causa probable | Solución |
|-------|---------------|----------|
| "Manifest merger failed" | Conflicto `allowBackup` | Agregar `tools:replace` en AndroidManifest |
| "App not installed" | Keystore diferente o fuente no permitida | `adb uninstall` + reinstalar |
| Pantalla blanca | `initDatabase` no completó | Verificar bootstrap en `_layout.tsx` |
| "Cannot read property of null" | Store no rehidratado | Verificar `persist` middleware en settings |
| Fecha desfasada | Uso de `toISOString()` | Cambiar a `localISOString()` |
| `toLocaleString is not a function` | RN no soporta todos los locales | Usar regex de formatMoney.ts |
| HeadlessJS no detecta | `main` en package.json incorrecto | Debe ser `"index.js"`, no `"expo-router/entry"` |

### Verificación
Tras resolver el bug, ejecutar mentalmente la validación de `wallet-validator`:
- Moneda COP con regex ✓
- Fechas con localISOString ✓
- Offline (sin fetch) ✓
- Tema dinámico ✓
- Imports con @/ ✓
