# 0004 — Límites de escala y costo en Firestore (estado en `master`)

**Fecha:** 2026-11-17

## Contexto

Fase 6 de la auditoría. MyWallet es serverless/BaaS (sin servidor propio, Firebase gestionado por
Google): el riesgo real de "muchos usuarios" no es que un servidor se caiga, es costo (lecturas/
escrituras de Firestore) e índices faltantes en producción real (el emulador es más permisivo que
Firestore real). Esta rama (`refactor/arquitectura-seguridad`) parte de `master`, que **no** tiene
todavía los límites de espacios compartidos que sí existen en `feature/pro-billing` (roles
editor/lector + límites Free/Pro, commit `ec8c48e`, sin fusionar) — este ADR documenta el estado
real de `master`, no el de esa otra rama.

## Índices compuestos

Se revisaron todas las queries reales a Firestore (`src/sync/remote.ts`, `spacesRemote.ts`):

- `pull()` (`remote.ts`): `where("serverUpdatedAt", ">=", cursor) + orderBy("serverUpdatedAt") +
  startAfter + limit` — un solo campo en el filtro y el orden, **no necesita índice compuesto**
  (Firestore indexa automáticamente cada campo por separado para este caso).
- `discoverSpaces()` (`spacesRemote.ts`): `where("memberUids", "array-contains", uid)`, un solo
  filtro — **no necesita índice**.
- `getInvite`/`createInviteDoc`: lecturas por id directo (`doc()`), no son queries.
- `findOwnInviteCode` (`where("createdBy", "==", uid) + where("spaceId", "==", spaceId)`, dos
  igualdades sobre campos distintos — Firestore no exige índice compuesto para combinaciones de
  solo igualdades, así que **no necesita índice** hoy. **Si esta query gana un `orderBy` o un
  filtro de rango en el futuro, ahí sí haría falta declarar un índice compuesto antes de
  desplegar** — Firestore avisa con un link directo a la consola la primera vez que corre sin él,
  pero mejor anticiparlo que descubrirlo en producción real.

## Límites de tamaño/capacidad

- **Miembros por espacio: SIN LÍMITE en esta rama.** `firestore.rules` no tiene ningún `maxMembers()`
  ni equivalente — un espacio puede crecer indefinidamente. `feature/pro-billing` ya resolvió esto
  (`MAX_SPACE_MEMBERS = 6`, reforzado en las reglas) pero esa rama no está fusionada a `master`.
  **Si se va a producción desde `master` tal cual, este es un gap real de costo** (cada miembro
  nuevo multiplica las lecturas de `transactions`/`members`/`config` de ese espacio) — no es una
  falla de seguridad (nadie se cuela sin código de invitación), es un límite de capacidad ausente.
- **Espacios ajenos que un usuario puede unirse: SIN LÍMITE en esta rama** (ídem, `FREE_MAX_JOINED_SPACES`
  es de `feature/pro-billing`).
- **Código de invitación**: 7 días de vencimiento (`expiresAt <= request.time + 8 días`, reforzado
  en las reglas, con margen de un día) — límite de TIEMPO sí existe y se hace cumplir del lado del
  servidor; el límite de CANTIDAD de miembros no.
- **Borrado en lote** (`deleteAll()` en `spacesRemote.ts`, usado al eliminar un espacio/cuenta):
  `BATCH_SIZE = 400`, con margen bajo el límite real de Firestore (500 operaciones por batch) —
  correcto, no es una magia number sin motivo.

## Paginación

- **Traída de cambios (`pull()`)**: cursor por `serverUpdatedAt` + `PAGE_SIZE = 300` por página,
  nunca "traer todo de una". Correcto para una colección que crece con el tiempo (transacciones).
- **Descubrir espacios (`discoverSpaces()`)**: sin `limit()` ni paginación — trae TODOS los espacios
  donde el usuario es miembro en una sola llamada. Hoy es seguro en la práctica (una persona está
  en pocos espacios, y sin límite de capacidad de por medio tampoco hay un control real de cuántos
  puede tener), pero si en el futuro se permite "unirse a muchos espacios" sin tope, esta query
  necesitaría paginación igual que `pull()`.

## Consecuencias

- **Antes de llevar `master` a producción real (Play Store) con espacios compartidos activos**,
  portar el límite de miembros por espacio desde `feature/pro-billing` (aunque sea sin el gating
  Pro, solo el `maxMembers()` de las reglas) — es protección de costo, no depende de la decisión de
  monetización.
- Si se agrega cualquier query nueva a Firestore, repetir este ejercicio: ¿tiene más de un campo en
  el filtro+orden? ¿Necesita paginación si la colección puede crecer sin límite conocido?

Código: `firestore.rules`, `src/sync/remote.ts`, `src/sync/spacesRemote.ts`.
