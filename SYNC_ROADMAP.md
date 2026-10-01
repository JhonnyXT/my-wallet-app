# SYNC_ROADMAP.md — Cuentas + sincronización con Firebase

Plan por fases para que MyWallet funcione **igual con y sin internet**, con cuenta de Google
para respaldar toda la data en la nube y compartir espacios con otras personas. Iniciado
2026-09-29. Cada fase deja la app funcionando y se puede probar sola; para implementar una fase
con detalle, generar su spec con `/sdd` a partir de la sección correspondiente.

**Estado:** Fases 0, 1 y 2 hechas. Fase 3 con el código hecho y probado en `dev` + emulador;
falta desplegar reglas y la prueba de punta a punta con `test` (ver checklist de la Fase 3).

---

## Objetivo

- Sin internet: la app funciona exactamente como hoy (registrar, editar, borrar, reportes, voz,
  detección bancaria…).
- Con internet y sesión iniciada:
  - **Respaldo:** todo lo que el usuario agrega se sube a la nube. Si cambia de celular, instala la
    app, inicia sesión y recupera todo.
  - **Espacios compartidos:** una lista (ej. "Vacaciones 🏖️") se comparte con otras personas. Cada
    una registra desde su teléfono y, al deslizar hacia abajo en el Dashboard, se traen los cambios
    de las demás.

## Principios (Regla inmutable #1 de `AGENTS.md`)

1. **SQLite + AsyncStorage siguen siendo la fuente de verdad.** La UI lee y escribe SIEMPRE local;
   la nube es una copia que se sincroniza.
2. **Nada bloquea esperando la red.** La sync corre en segundo plano; si falla, se reintenta y la
   app sigue funcionando.
3. **La red solo vive en `src/sync/`.** Pantallas, stores y utilidades no importan Firebase.
4. **Iniciar sesión es opcional para usar la app** (ver decisión T7): sin cuenta, todo funciona
   igual, solo que sin respaldo ni espacios compartidos.
5. **Cero datos bancarios sensibles en la nube** (Regla #6): el texto crudo de las notificaciones
   bancarias no se sube; solo los movimientos que el usuario confirma.

## Decisiones tomadas

| # | Decisión | Por qué |
|---|---|---|
| T1 | **Firebase** (Firestore + Auth), plan gratis Spark | No se pausa por inactividad (Supabase/PowerSync gratis sí, a la semana); 1 GiB, 50K lecturas y 20K escrituras/día, 50K usuarios/mes gratis; SDK nativo para React Native con cola offline propia. Ver investigación del 2026-09-29 en el historial de la sesión. |
| T2 | **SQLite local se queda**, Firebase es capa de sync | Todo lo que ya funciona (presupuestos, cuentas, CSV, reportes, `LIST_SCOPE_SQL`) sigue leyendo SQLite sin cambios. |
| T3 | **Login solo con Google**, como primer paso del onboarding | Pedido del usuario. Después sigue el onboarding actual (categorías → pago → notificaciones → bancos). Apple queda para cuando exista la app de iOS (ver "Pendiente para iOS"). |
| T4 | **Se respalda toda la data del usuario**, no solo los espacios compartidos | Para no perder nada al cambiar de celular (ver inventario abajo). |
| T5 | Conflictos: **gana la última edición** (`updatedAt`) | Estándar de Firestore; dos personas editando el mismo gasto al mismo segundo es rarísimo. |
| T6 | Borrados como **tombstone** (`deletedAt`), no borrado físico | Si no, el otro teléfono nunca se entera de que tenía que borrar su copia. |
| T7 | **El login del onboarding se puede saltar** (decidido 2026-09-29, era D1) | Sin un botón destacado de "Continuar sin cuenta": la pantalla ofrece Google y una opción discreta para saltar, y al saltar se avisa que puede iniciar sesión cuando quiera desde **Ajustes → Cuenta** para respaldar su información por si cambia o pierde el celular. Así el primer arranque no exige internet. |
| T8 | **Primer login con datos en el teléfono y en la nube: se unen** (era D3) | Nada se pierde y no hay choques porque cada registro tiene id único (Fase 1). |
| T9 | **Al cerrar sesión se pregunta** "Mantener en este teléfono" / "Borrar de este teléfono" (era D4) | Borrar sirve para dejar o vender el celular; mantener, para solo desconectar la cuenta. |
| T10 | **Un entorno de Firebase por variant** (era D6, decidido por el usuario) | `dev` → **Firebase Emulator** local (pruebas de desarrollo, sin cuota ni datos reales). `test` → proyecto **`mywallet-test`**: lo usan testers y el usuario en su propio teléfono con datos reales. `prod` → proyecto **`mywallet-prod`**, el de Google Play. Así la data de testers nunca se mezcla con la de usuarios publicados. |
| T11 | **Sin cifrado de extremo a extremo** por ahora (era D7) | Google cifra en reposo. Reevaluar solo si se quiere prometer "ni nosotros vemos tus datos". |

---

## Inventario: qué vive en el dispositivo y qué se sincroniza

| Dato | Dónde vive hoy | ¿Se sincroniza? | Notas |
|---|---|---|---|
| Transacciones (gastos/ingresos, tags, método de pago, lista, quién pagó) | SQLite `transactions` | ✅ | La pieza principal. Las de un espacio compartido van al espacio, no al respaldo personal. |
| Listas (`lists`: nombre, emoji, miembros, período, categorías, presupuestos, `showIncome`) | AsyncStorage `mywallet-settings` (`listsSlice`) | ✅ | ⚠️ Los datos de la lista ACTIVA viven en `defaultPeriod`/`userCategories`/`budgetByCategory` (patrón de intercambio): al subir, tomar esos campos vivos para la lista activa, no la copia vieja de `lists[]`. |
| Categorías de la lista activa (`userCategories`) | AsyncStorage (`categoriesSlice`) | ✅ | Ver aviso de listas. |
| Presupuestos por categoría (`budgetByCategory`) | AsyncStorage (`budgetSlice`) | ✅ | Ídem. |
| Pago y período (`defaultPeriod`, incluye `pay`) | AsyncStorage (`prefsSlice`) | ✅ | Ídem. |
| Métodos de pago (`paymentMethods`, con `emoji?`) | AsyncStorage (`paymentsSlice`) | ✅ | |
| Metas de ahorro (`savingsGoals`) | AsyncStorage (`goalsSlice`) | ✅ | |
| Deudas (`debts`) | AsyncStorage (`debtsSlice`) | ✅ | Los recordatorios mensuales (`scheduleDebtReminder`) se reprograman en cada teléfono al bajar las deudas. |
| Alertas de presupuesto (activadas, umbral) | AsyncStorage (`notificationsSlice`) | ✅ | |
| Bancos activos y "Detectar transacciones" | AsyncStorage directo (`ALLOWED_BANKS_KEY`, `AUTO_DETECT_ENABLED_KEY`) | ✅ bancos / ⚠️ activación | La lista de bancos sí. "Detectar" depende del permiso de notificaciones de CADA teléfono: al restaurar, mostrarlo apagado hasta que se conceda el permiso otra vez. |
| Nombre del usuario (`userName`), modo oscuro (`darkMode`) | AsyncStorage (`prefsSlice`) | ✅ | Preferencias de la cuenta. |
| Onboarding completado (`hasCompletedOnboarding`, `hasSelectedCategories`) | AsyncStorage | ✅ | Al restaurar en un teléfono nuevo, saltar el onboarding que ya se hizo. |
| Bloqueo con huella (`biometricLockEnabled`) | AsyncStorage | ❌ | Depende de la huella/PIN de cada teléfono. |
| Paso del tour (`onboardingStep`), aviso de micrófono (`MIC_DISCLOSED_KEY`) | AsyncStorage | ❌ | Propios de cada instalación. |
| Marcas "ya notificado" (`budgetNotifiedMonth`, `goalNotifiedIds`) | AsyncStorage | ❌ | Son para no repetir avisos en ESTE teléfono. |
| Permiso de notificaciones (`notificationsEnabled`) | AsyncStorage | ❌ | Permiso del sistema de cada teléfono. |
| Cola de notificaciones bancarias pendientes | AsyncStorage `notification-pending-queue` | ❌ | Texto crudo del banco (Regla #6) y propio del teléfono que la detectó. |
| Historial del Chat NLP | SQLite `chat_sessions`/`chat_messages` | ❌ | No aplica: `app/(tabs)/chat.tsx` existe en el código pero ninguna navegación lleva a él (pestañas ocultas), así que ningún usuario lo usa. Código huérfano candidato a limpieza. |

## Modelo en Firestore

```
users/{uid}
  profile                      → { userName, darkMode, onboardingDone, createdAt }
  settings/app                 → { budgetAlertsEnabled, budgetAlertThreshold, allowedBanks, updatedAt }
  lists/{listId}               → { name, emoji, period, categories, budgets, showIncome,
                                   members, spaceId?, updatedAt, deletedAt? }
  paymentMethods/{id}          → { name, type, emoji?, updatedAt, deletedAt? }
  goals/{id}                   → { name, emoji, targetAmount, savedAmount, createdAt, updatedAt, deletedAt? }
  debts/{id}                   → { name, emoji, totalAmount, remainingAmount, monthlyPayment,
                                   dueDay, createdAt, updatedAt, deletedAt? }
  transactions/{txId}          → { amount, description, category_emoji, date, tags, payment_method,
                                   list_id, paid_by, updatedAt, deletedAt? }

spaces/{spaceId}               → { name, emoji, ownerUid, inviteCode, memberUids[], createdAt }
  members/{uid}                → { name, joinedAt }
  meta/config                  → { period, categories, budgets, showIncome, updatedAt }
  transactions/{txId}          → { …igual que arriba, paid_by: uid, createdBy: uid }

inviteCodes/{code}             → { spaceId, createdBy, expiresAt }
```

- Colecciones con un documento por ítem (no un solo documento gigante) para subir y bajar solo lo
  que cambió (`where('updatedAt', '>', ultimaSync)`) y no pelear por el límite de 1 MiB por doc.
- `paid_by` en la nube es el `uid` real. Al bajar: mi `uid` → `SELF_PAYER` (`""`) local; el `uid`
  de otro → el `ListMember.id` que lo representa. Al subir, lo inverso.
- Reglas de seguridad: `users/{uid}/**` solo lo lee y escribe su dueño; `spaces/{id}/**` solo
  quien está en `memberUids`; unirse con código solo si `inviteCodes/{code}` existe y no venció.
  Todo sin Cloud Functions (plan gratis sin tarjeta).

## Cómo funciona la sync

- **Subir (push):** al guardar algo local, se marca `updated_at` y "pendiente"; la capa de sync lo
  escribe en Firestore con el mismo id. El SDK de Firebase guarda esa escritura en su cola aunque
  no haya internet o se cierre la app, y la manda sola al volver la conexión. Cuando el servidor
  confirma, la fila deja de estar pendiente. Si la app se cerró antes, se vuelve a mandar (es la
  misma escritura, no duplica).
- **Bajar (pull):** al iniciar sesión, al abrir la app y con el pull-to-refresh del Dashboard, se
  piden los documentos con `updatedAt` posterior a la última sync y se aplican en SQLite /
  AsyncStorage (si el local es más nuevo, gana el local). Los `deletedAt` borran la copia local.
- **Pull-to-refresh en el Dashboard:** el gesto de deslizar hacia abajo hoy solo existe con un
  filtro de categoría activo (`pullMode` en `app/(tabs)/index.tsx`); sin filtro está libre. Se usa
  para "traer cambios" con un indicador animado propio (sin el spinner por defecto de Android).
- **Stores sin tocar Firebase:** la capa de sync escucha los cambios de `useSettingsStore`
  (`subscribe` de Zustand) y de las escrituras de `src/db/db.ts`, y aplica lo que baja con las
  acciones normales de los stores.

---

## Fases

Tamaño aproximado: S (días), M (1–2 semanas), L (2–4 semanas).

### Fase 0 — Reglas y plan ✅ (2026-09-29)
- [x] Regla inmutable #1 pasa de "offline-first, cero llamadas externas" a "local-first con sync
  opcional a Firebase" en `AGENTS.md`, `CONTEXT.md`, `PRODUCT_REQUIREMENTS.md`,
  `.cursor/rules/project-conventions.mdc`, `wallet-validator` y los workflows (`commit`, `sdd*`).
- [x] Este archivo.
- Sin tocar a propósito (describen la app publicada, que hoy sigue 100% offline): `README.md`,
  `DOCUMENTATION.md`, `docs/privacy-policy.html`, `docs/index.html`, `landing/`. Se actualizan en
  la Fase 5, cuando la sync exista de verdad.

### Fase 1 — Preparar los datos locales para sincronizar (sin red) · M ✅ (2026-09-29)
Nada visible cambia; deja todo listo para que dos teléfonos no choquen. Spec local (no
versionado, `specs/` está en `.gitignore`): `specs/sync-fase-1-datos-locales/`.
- [x] `transactions`: columnas nuevas `uid` (uuid estable entre teléfonos), `updated_at`,
  `deleted_at`, `sync_state` (migración aditiva en `db.ts`, como `list_id`/`paid_by`). Backfill de
  uuids para las filas existentes.
- [x] Borrar una transacción pasa a borrado lógico (`deleted_at`) y todas las queries lo excluyen
  (junto con `LIST_SCOPE_SQL`). Purga física de tombstones viejos ya sincronizados.
- [x] Ids estables en `lists`, `paymentMethods`, `savingsGoals`, `debts` + `updatedAt` en cada
  ítem. Migración del store persistido (`version: 2`, `migrateSettings()`). Decidido: los ids
  existentes se conservan (los referencian transacciones, avisos y recordatorios); solo los nuevos
  son UUID (`expo-crypto`).
- [x] Borrar lista/método/meta/deuda también como tombstone — en un registro aparte
  (`tombstones`), no como `deletedAt` dentro del arreglo, para no filtrar en cada consumidor.
- [x] Tests de migraciones y de la lógica pura de "gana el más nuevo" (`pickWinner`).
- Pendiente para la Fase 3: `updatedAt` de `profile`/`settings/app` y purga de los tombstones de
  ajustes (definir junto con el estado "sincronizado"). Quien nunca inicia sesión no purga
  tombstones de transacciones (nunca llegan a `synced`); evaluar en Fase 3.

**Hecho cuando:** la app funciona igual que hoy y cada registro tiene id único, fecha de edición
y borrado lógico.

### Fase 2 — Firebase + cuentas (Google) · M ✅ (2026-09-30)
Spec local (no versionado): `specs/sync-fase-2-cuentas/spec.md`.
- [x] Entornos según T10: `dev` → Firebase Emulator (`npm run emulators`, necesita JDK 21 en
  `~/.local/jdk-21`); `test` → proyecto **`mywallet-test-jb`** (`mywallet-test` estaba tomado en
  Google Cloud) con `com.mywallet.app.test` y `com.mywallet.app` (dev, solo para el cliente OAuth);
  `prod` → **`mywallet-prod`** con `com.mywallet`. Firestore en `nam5`, reglas que niegan todo hasta
  la Fase 3. SHA-1 de la debug keystore registrada en las dos apps de test.
- [x] `@react-native-firebase/app`/`auth`/`firestore` 26.4 + `@react-native-google-signin/google-signin`
  16.1 (versión gratis), plugins en `app.config.ts`, un `google-services.json` por variant en
  `firebase/` (versionados) y el `webClientId` sacado de ahí al compilar.
- [x] Onboarding paso 0 (`app/login-onboarding.tsx`): "Continuar con Google" o "Ahora no" con el
  aviso de Ajustes → Cuenta (T7).
- [x] Ajustes → **CUENTA**: iniciar sesión, cerrar sesión, eliminar cuenta. Cerrar sesión **no**
  ofrece borrar los datos del teléfono todavía: sin respaldo en la nube se perdería todo; la
  pregunta de T9 se agrega en la Fase 3.
- [x] `src/sync/` con el cliente y la sesión; `sync.boundary.test.ts` falla si algo fuera de ahí
  importa Firebase.
- [x] `AGENTS.md` → Build variants con T10.
- Verificado en el teléfono (dev + emulador): login con Google, cerrar sesión y eliminar cuenta;
  el usuario aparece y desaparece en el emulador, nunca en la nube, y los datos locales no cambian.
- Pendiente de probar: el onboarding nuevo en una instalación limpia de `test` contra
  `mywallet-test-jb`, y el login sin internet (mensaje de error).
- Para la Fase 3: `deleteAccount()` debe borrar `users/{uid}` en Firestore antes del usuario de Auth;
  registrar la SHA-1 de EAS en `mywallet-prod` antes del primer build de producción.

### Fase 3 — Respaldo en la nube de toda la data · L — 🟡 en curso (código hecho y probado en dev)
Spec local (no versionado): `specs/sync-fase-3-respaldo/` (requirements, design, impacto, tareas,
test-plan). Decisiones del usuario (2026-09-30): si el teléfono tiene datos de otra cuenta, se
**pregunta** "Unir / Borrar del teléfono y usar esta"; "Borrar de este teléfono" se **bloquea** si
hay cambios sin subir.
- [x] Push de todo lo del inventario marcado ✅ (transacciones, listas con los datos vivos de la
  activa, métodos de pago, metas, deudas, alertas, bancos, perfil con el onboarding hecho).
- [x] Primera subida al iniciar sesión, en segundo plano (traer → unir → subir, así la primera
  subida no pisa algo más nuevo de la nube).
- [x] Pull al iniciar sesión, al abrir la app, al volver a primer plano y con pull-to-refresh en el
  Dashboard (indicador propio); se unen con lo local (T8, `pickWinner`). El orden de traída es la
  hora del servidor (`serverUpdatedAt`), no la del teléfono.
- [x] Restaurar: iniciar sesión desde el onboarding → trae todo → si ya había onboarding, entra
  directo al Dashboard; reprograma recordatorios de deudas; "Detectar transacciones" no se trae.
- [x] Estado en Ajustes → Cuenta ("Respaldado hace…", "N cambios pendientes (sin conexión)",
  "Respaldando…"); tocarlo sincroniza ya.
- [x] Cerrar sesión con "Mantener / Borrar de este teléfono" (T9); datos de otra cuenta; eliminar
  cuenta borra `users/{uid}` (reautentica antes si el login no es reciente).
- [x] Reglas de `users/{uid}` + tests con el emulador (`npm run test:rules`, 4 casos).
- [x] Probado en el teléfono con `dev` + emulador (2026-09-30): subida, traer desde "otro teléfono",
  Mantener sin duplicados, sin conexión con Borrar bloqueado, datos de otra cuenta (Unir), Borrar y
  restaurar, eliminar cuenta.
- [ ] **Desplegar las reglas nuevas** a `mywallet-test-jb` y `mywallet-prod`
  (`npx firebase-tools deploy --only firestore:rules --project <id>`). Hoy en la nube sigue la de la
  Fase 2 (niega todo): el build `test` no puede respaldar nada hasta hacerlo.
- [ ] **Prueba de punta a punta con `test` contra la nube real** (`npm run build:test`): registrar →
  desinstalar → reinstalar → iniciar sesión → ver lo mismo; gastos en modo avión que suben al volver.
  Cubre también lo pendiente de la Fase 2 (login real en `test`, sin internet en el onboarding).
- [ ] Marcar la fase hecha y actualizar el estado arriba.

**Hecho cuando:** borrar la app, reinstalarla, iniciar sesión y ver exactamente lo mismo que
antes; y registrar gastos en modo avión que aparecen en la nube al volver la conexión.

### Fase 4 — Espacios compartidos · L
- [ ] "Compartir este espacio" en `ListEditorSheet`: crea `spaces/{id}`, genera un código de 6
  dígitos con vencimiento y lo comparte (WhatsApp, etc.).
- [ ] "Unirme a un espacio" (Tus listas → +): escribir el código → se une y baja el espacio como
  una lista más.
- [ ] Miembros reales: cada `ListMember` queda ligado a un `uid`; estados "invitado" / "se unió".
  Los miembros solo-nombre de hoy siguen funcionando para quien no usa la app.
- [ ] Transacciones del espacio: push/pull contra `spaces/{id}/transactions`, mapeo de `paid_by`.
- [ ] Pull-to-refresh del Dashboard trae los cambios del espacio activo.
- [ ] Salir de un espacio, quitar a alguien (solo el dueño), qué pasa si el dueño borra el espacio.
- [ ] Cuentas (`settlement.ts`) sin cambios: siguen calculando sobre SQLite.

**Hecho cuando:** dos teléfonos con cuentas distintas registran gastos en el mismo espacio (con y
sin internet) y, tras deslizar hacia abajo, los dos ven lo mismo y las mismas cuentas.

### Fase 5 — Cumplimiento y publicación · S
- [ ] Política de privacidad (`docs/privacy-policy.html` y la de `landing/`): qué se sube, dónde
  (Google Cloud), para qué, cómo borrarlo.
- [ ] Google Play: formulario de Data Safety (datos financieros y de cuenta recolectados) y **URL
  web para pedir la eliminación de la cuenta**.
- [ ] `README.md`, `DOCUMENTATION.md` (FAQ "¿funciona sin internet?"), `docs/index.html`,
  `landing/` (textos que hoy dicen "100% offline").
- [ ] Build `prod` por EAS con los SHA-1 de producción registrados en Firebase.

---

## Pendiente para iOS (no aplica a Android)

Decidido 2026-09-29: en Android solo Google. Cuando se publique la app en iOS:

- **Agregar "Iniciar sesión con Apple"**: la guía 4.8 de la App Store exige, si la app ofrece
  login con un tercero como Google, ofrecer también una opción de login que proteja la privacidad
  (Sign in with Apple la cumple). Sin ella, Apple puede rechazar la app.
- Requiere cuenta de Apple Developer (US$99/año, que igual hace falta para publicar en iOS),
  proveedor Apple en Firebase y `@invertase/react-native-apple-authentication` o
  `expo-apple-authentication`.
- Vincular Google y Apple a la misma cuenta de Firebase si la persona usa los dos.

## Riesgos

- **Dos copias en el teléfono:** Firestore guarda su propia caché además de SQLite. Se deja
  activada porque su cola de escrituras pendientes sobrevive al cierre de la app; limitar su tamaño.
- **Patrón de intercambio de listas:** subir `lists[]` sin tomar los campos vivos de la lista
  activa subiría datos viejos (ver inventario).
- **Límites gratis:** holgados para uso personal y amigos; vigilar las lecturas si un día se usan
  listeners en tiempo real en vez de pull incremental.
- **Datos de `dev`:** hoy la app `dev` (`com.mywallet.app`) tiene datos de prueba. Decidido
  2026-09-29: no se migran, `test` arranca desde cero. Probar las migraciones de la Fase 1 con
  respaldo previo igual (`scripts/seed-dev-data.py` ya respalda en `~/mywallet-backups/`).
- **Dependencia de Google:** si algún día se quiere salir, el modelo por documentos y los ids
  estables facilitan migrar (ej. a Supabase + PowerSync).

## Referencias

- Firebase pricing: https://firebase.google.com/pricing
- Firestore offline: https://firebase.google.com/docs/firestore/manage-data/enable-offline
- React Native Firebase: https://rnfirebase.io
- Guía 4.8 de la App Store (login): https://developer.apple.com/app-store/review/guidelines/#login-services
- Eliminación de cuenta en Google Play: https://support.google.com/googleplay/android-developer/answer/13327111
- Local-first con Expo: https://docs.expo.dev/guides/local-first/
