# 0006 — `signOutWith` chequea pendientes dos veces (antes y después de `signOut()`)

**Fecha:** histórica (T9 del roadmap de sync) — documentada ahora en la Fase 4 de la auditoría
(2026-11-17), sin ADR ni mención previa en `AGENTS.md`/`CONTEXT.md`.

## Contexto

Cerrar sesión con "Borrar de este teléfono" (`mode: "wipe"`) no debe proceder si hay cambios sin
respaldar (RF-12) — perdería datos del usuario. `signOutWith()` (`src/sync/engine.ts`) hace esta
comprobación.

## Problema / Decisión

Se comprueban los pendientes **dos veces**: antes de `signOut()` y de nuevo después. `signOut()`
hace red (Firebase + Google Sign-In) y, por la Regla inmutable #1 (local-first, ninguna acción
bloquea esperando la red), el resto de la app sigue funcionando mientras esa llamada está en
curso — en esa ventana puede entrar un cambio local nuevo (ej. una notificación bancaria detectada
en background mientras se cierra sesión).

Sin el segundo chequeo, `wipeLocalData()` borraría ese cambio sin haberse respaldado nunca —
exactamente lo que el primer chequeo pretendía impedir. Si el segundo chequeo bloquea, la sesión
YA se cerró (no se puede deshacer `signOut()`) pero los datos locales se conservan intactos sin
borrar; `alreadySignedOut: true` se lo indica a quien llama (`AccountSection`), para mostrar un
mensaje distinto ("vuelve a entrar para subirlos") en vez de "conéctate" a alguien que ya salió.

## Consecuencias

No quitar el segundo chequeo pensando que es redundante con el primero — cubre una ventana de
carrera real, no una validación duplicada por las dudas.

Código: `src/sync/engine.ts` → `signOutWith`.
