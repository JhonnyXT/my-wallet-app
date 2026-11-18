# 0005 — `mergeIntoAccount` resetea el progreso de sync al unir con una cuenta nueva

**Fecha:** histórica (commit `d471622`, 2026-10-13) — documentada ahora en la Fase 4 de la
auditoría (2026-11-17), no tenía ADR ni mención en `AGENTS.md`/`CONTEXT.md`.

## Contexto

`resolveAccountConflict("merge")` (`src/sync/engine.ts`) une los datos del teléfono con una cuenta
de Firebase distinta a la que los creó (RF-13: el teléfono tenía otra sesión antes). Antes del
fix, se reutilizaba el `SyncMeta` completo de la cuenta anterior, solo cambiando `ownerUid`.

## Problema / Decisión

El `SyncMeta` (`cursors`, `pushed`, `pushedDocs`, `pushedSpaces`) es el progreso de sync de la
cuenta ANTERIOR: hasta dónde trajo datos, qué ítems ya subió. Reutilizarlo tal cual con la cuenta
nueva lo deja todo silenciosamente incompleto de dos formas:

- Un `cursor` heredado puede ser más reciente que los datos reales de la cuenta nueva (que nunca se
  bajarían, porque la traída pide "todo después de este cursor").
- Los ids fijos que existen en todo teléfono (lista `"personal"`, métodos de pago por defecto)
  quedarían marcados en `pushed` como "ya subidos", sin haberse escrito nunca en la cuenta nueva —
  se perderían en silencio al restaurar desde esa cuenta en otro dispositivo.

`mergeIntoAccount()` (`src/sync/meta.ts`) resetea `cursors`/`pushed`/`pushedDocs`/`pushedSpaces` a
`emptyMeta()` cuando `ownerUid` cambia de verdad a otra cuenta — **excepto** `banks`, que es
configuración del teléfono (AsyncStorage directo), no de la cuenta, y no debe perderse.

## Consecuencias

No simplificar `mergeIntoAccount()` a solo `{ ...meta, ownerUid: uid }` sin el reset condicional:
reintroduciría la pérdida de datos silenciosa que este fix corrigió. Los 3 tests en `meta.test.ts`
(cuenta distinta resetea todo menos `banks`; dispositivo nuevo no tiene nada que resetear; mismo
dueño conserva el progreso) cubren exactamente este invariante.

Código: `src/sync/meta.ts` → `mergeIntoAccount`.
