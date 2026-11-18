# 0008 — `ALLOWED_BANKS_KEY` vacío significa "todos los bancos", no "ninguno"

**Fecha:** histórica — documentada ahora en la Fase 4 de la auditoría (2026-11-18), sin ADR ni
mención previa en `AGENTS.md`/`CONTEXT.md`.

## Contexto

`ALLOWED_BANKS_KEY` (`src/constants/banks.ts`) es la lista de bancos de los que el usuario quiere
que la app detecte transacciones automáticamente. Se escribe desde dos lugares independientes:
`bank-selection-onboarding.tsx` (primera selección) y `AutoDetectSection.tsx` (Ajustes, para
editarla después), y se lee desde `notificationHeadlessTask.ts` (proceso headless, sin React) para
decidir si una notificación de un banco dado debe procesarse.

## Problema / Decisión

Un array vacío en `ALLOWED_BANKS_KEY` significa **"todos los bancos"** (sin restricción), no
"ninguno". Es la convención ya usada por `AutoDetectSection.tsx` (si el usuario selecciona todos
los bancos conocidos, se guarda `"[]"` en vez de la lista completa) y que
`bank-selection-onboarding.tsx` reproduce (`allSelected ? "[]" : JSON.stringify([...selected])`).

Como un array vacío no puede representar también "ninguno", seleccionar cero bancos en el
onboarding no escribe `ALLOWED_BANKS_KEY` — apaga `AUTO_DETECT_ENABLED_KEY` por completo en su
lugar (`handleSave`, `bank-selection-onboarding.tsx`).

## Consecuencias

Cualquier código nuevo que lea o escriba `ALLOWED_BANKS_KEY` tiene que respetar esta convención
(vacío = todos, nunca "ninguno"): guardar la lista completa en vez de `"[]"` cuando están todos
seleccionados no rompe nada funcionalmente, pero diverge del otro call site sin necesidad y hace
más frágil un futuro cambio que sí dependa de distinguir "todos" de "una lista larga".

Código: `src/constants/banks.ts` (`ALLOWED_BANKS_KEY`), `app/bank-selection-onboarding.tsx` →
`handleSave`, `src/components/settings/AutoDetectSection.tsx`, `src/services/notificationHeadlessTask.ts`.
