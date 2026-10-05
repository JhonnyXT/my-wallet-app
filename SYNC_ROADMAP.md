# SYNC_ROADMAP.md — Cuentas + sincronización con Firebase

Plan por fases para que MyWallet funcione **igual con y sin internet**, con cuenta de Google
para respaldar toda la data en la nube y compartir espacios con otras personas. Iniciado
2026-09-29. Cada fase deja la app funcionando y se puede probar sola; para implementar una fase
con detalle, generar su spec con `/sdd` a partir de la sección correspondiente.

**Estado:** Fases 0, 1, 2 y 3 hechas (la 3 probada de punta a punta con `test` contra la nube
real el 2026-10-05). Fase 4 (espacios compartidos) con el código hecho y probado con dos
teléfonos en `dev` y reglas desplegadas; falta probarla con `test` contra la nube real. Fase 5:
textos legales y de la app actualizados; faltan el build `prod` por EAS y llenar Play Console.

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
                                   members, space?, updatedAt, deletedAt? }
  paymentMethods/{id}          → { name, type, emoji?, updatedAt, deletedAt? }
  goals/{id}                   → { name, emoji, targetAmount, savedAmount, createdAt, updatedAt, deletedAt? }
  debts/{id}                   → { name, emoji, totalAmount, remainingAmount, monthlyPayment,
                                   dueDay, createdAt, updatedAt, deletedAt? }
  transactions/{txId}          → { amount, description, category_emoji, date, tags, payment_method,
                                   list_id, paid_by, updatedAt, deletedAt? }
                                   (borrado: solo { updatedAt, deletedAt }, sin contenido)

spaces/{spaceId}               → { ownerUid, memberUids[], deletedAt, joinCode?, createdAt }
  members/{memberId}           → { name, uid | null, joinedAt?, leftAt?, updatedAt }
  config/list                  → { name, emoji, categories, showIncome, updatedAt }
  transactions/{txId}          → { …igual que arriba sin list_id, paid_by: memberId }

inviteCodes/{code}             → { spaceId, createdBy, expiresAt }
```

- Colecciones con un documento por ítem (no un solo documento gigante) para subir y bajar solo lo
  que cambió (`where('updatedAt', '>', ultimaSync)`) y no pelear por el límite de 1 MiB por doc.
- (Ajustado al implementar la Fase 4.) `paid_by` en un espacio es el id de miembro, no el `uid`:
  el mío ↔ `SELF_PAYER` (`""`) local vía `space.selfMemberId`; reclamar a una persona sin app le
  liga el `uid` sin cambiarle el id. Período y presupuestos no están en `config/list`: son de cada
  persona y viajan en `users/{uid}/lists/{id}`. Sin `createdBy` en los movimientos.
- Reglas de seguridad: `users/{uid}/**` solo lo lee y escribe su dueño; `spaces/{id}/**` solo
  quien está en `memberUids`; unirse con código solo si `inviteCodes/{code}` es de ese espacio y no
  venció, y solo agregándose a uno mismo. Todo sin Cloud Functions (plan gratis sin tarjeta).

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
- Probado con `test` contra `mywallet-test-jb` el 2026-10-05 (ver Fase 3): login real tras una
  instalación limpia y login sin internet (mensaje de error).
- Para la Fase 3: `deleteAccount()` debe borrar `users/{uid}` en Firestore antes del usuario de Auth;
  registrar la SHA-1 de EAS en `mywallet-prod` antes del primer build de producción.

### Fase 3 — Respaldo en la nube de toda la data · L ✅ (2026-10-05)
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
- [x] Reglas nuevas desplegadas a `mywallet-test-jb` y `mywallet-prod` (2026-10-05,
  `npx firebase-tools deploy --only firestore:rules --project <id>`).
- [x] Prueba de punta a punta con `test` contra `mywallet-test-jb` (2026-10-05): primer login con
  los datos que ya tenía la app (subió todo), 2 gastos en modo avión que subieron al volver la
  conexión, desinstalar → reinstalar → "Continuar con Google" entra directo al Dashboard; el login
  sin internet muestra el aviso sin trabarse (cubre lo pendiente de la Fase 2).
- Encontrado en esa prueba: la lista Personal, el perfil y los ajustes de una instalación anterior
  a la sync subían con `updatedAt` 0, igual que los de un teléfono recién instalado, y el empate
  lo ganaba lo local (restaurar perdía categorías, período, pago y el onboarding). `pickWinner`
  ahora da el empate en 0 a lo respaldado.

**Hecho cuando:** borrar la app, reinstalarla, iniciar sesión y ver exactamente lo mismo que
antes; y registrar gastos en modo avión que aparecen en la nube al volver la conexión.

### Fase 4 — Espacios compartidos · L — 🟡 código hecho y probado en `dev`
Spec local (no versionado): `specs/sync-fase-4-espacios/`. Decisiones del usuario (2026-10-05):
quien sale, es quitado o pierde el espacio porque el dueño lo eliminó **conserva la lista como
propia** (desconectada, respaldada en su cuenta); se comparten **nombre, ícono, categorías,
"mostrar ingresos" y personas**, mientras que **período y presupuestos son de cada persona**.
Del diseño: el código es de 6 caracteres alfanuméricos sin 0/O/1/I (no 6 dígitos: sin servidor
que limite intentos, un millón de combinaciones se adivina) y vence a los 7 días; mover un
movimiento de lista le da un `uid` nuevo. Pruebas con dos teléfonos (el usuario tiene un segundo
Android).
- [x] "Compartir lista" en el editor de la lista: crea `spaces/{id}` y un código de 6 caracteres
  (sin 0/O/1/I) que vence a los 7 días; se manda con la hoja del sistema.
- [x] "Unirme con un código" (Tus listas): se une y baja el espacio como una lista más.
- [x] Miembros reales: cada persona del espacio es un documento, con o sin app; "¿Quién eres?" liga
  la cuenta a una persona sin app ("soy Hernan") sin reescribir sus movimientos; punto verde = se
  unió. Las personas sin app siguen funcionando.
- [x] Movimientos del espacio: push/pull contra `spaces/{id}/transactions` con cursor propio, mapeo
  de `paid_by` (`selfMemberId`). Mover un movimiento de lista le da un `uid` nuevo.
- [x] Deslizar sobre el balance del Dashboard trae los cambios (rehecho con Reanimated: el balance
  y la lista bajan, anillo → spinner → ✓, o nube tachada sin conexión).
- [x] Salir, quitar a alguien (solo el dueño), eliminar para todos (solo el dueño); quien pierde el
  espacio conserva la lista como propia. Volver a unirse recupera el mismo miembro.
- [x] Cuentas (`settlement.ts`) sin cambios: siguen calculando sobre SQLite.
- [x] Reglas de `spaces/**` e `inviteCodes` + 23 tests con el emulador.
- [x] Probado con dos teléfonos y dos cuentas en `dev` + emulador (2026-10-05): compartir, unirse
  como persona existente, gastos en los dos sentidos con las mismas cuentas, editar el gasto del
  otro, sin conexión (sube al volver), lo compartido llega y el período no, salir, volver a
  unirse, eliminar para todos.
- [x] Reglas nuevas desplegadas a `mywallet-test-jb` y `mywallet-prod` (2026-10-05).
- [ ] Probar con `test` contra la nube real (dos teléfonos).
  Incluye los borrados sin contenido (Fase 5): instalar `test` con este código, comprobar que un
  borrado anterior queda en Firestore solo con `{ updatedAt, deletedAt }` tras sincronizar, que
  un borrado nuevo sube así, y que el otro teléfono lo borra (lista personal y compartida).

**Hecho cuando:** dos teléfonos con cuentas distintas registran gastos en el mismo espacio (con y
sin internet) y, tras deslizar hacia abajo, los dos ven lo mismo y las mismas cuentas.

### Fase 5 — Cumplimiento y publicación · S — 🟡 textos hechos (2026-10-05)
- [x] Política de privacidad (`docs/privacy-policy.html` y la de `landing/`): qué se sube (y qué
  no: notificaciones, audio), dónde (Firebase, Google Cloud en EE. UU.), para qué, listas
  compartidas, cómo borrarlo. Correo de contacto unificado en `jonathanblandon1017@gmail.com`
  (`docs/` tenía `…101@`, un error de tipeo).
- [x] **URL web para pedir la eliminación de la cuenta**: `landing/` → `/[lang]/delete-account`
  (`https://mywallet-blush.vercel.app/es/delete-account`), con los pasos en la app y un `mailto:`
  prellenado desde el correo de la cuenta (sin formulario ni backend). Falta desplegar la landing
  (`vercel deploy --prod`).
- [x] Respuestas del formulario de Data Safety y procedimiento para atender una solicitud de
  eliminación: [`PLAY_DATA_SAFETY.md`](PLAY_DATA_SAFETY.md). Llenarlo en Play Console es manual.
- [x] `README.md`, `DOCUMENTATION.md` (FAQ "¿funciona sin internet?", cuenta, eliminar),
  `docs/index.html`, `landing/` (textos que decían "100% offline" / "sin cuenta").
- [x] Un movimiento borrado sube solo la marca `{ updatedAt, deletedAt }`, sin su contenido; los
  que ya habían subido con contenido se reemplazan una vez por teléfono (`tombstonesStripped`).
  Se prueba junto con la Fase 4 en `test` (ver abajo).
- [x] Quitar permisos que no se usan del manifest con `android.blockedPermissions`
  (`READ_PHONE_STATE`, almacenamiento, `SYSTEM_ALERT_WINDOW`; ver `PLAY_DATA_SAFETY.md`). Falta
  verificarlo en el build `test` (manifest mergeado + detección bancaria en el teléfono).
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
