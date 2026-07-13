---
description: Implementa código a partir de un spec SDD existente
argument-hint: <ruta del spec o nombre de la feature>
---

Entra en **SDD_MODE**. Implementa la feature a partir del spec: $ARGUMENTS (búscalo en `specs/`).

- Usa `requirements.md`, `design.md` y `tasks.md` como **fuente de verdad**. Si algo no está claro,
  detente y sugiere `/sdd-clarify` en vez de asumir.
- Sigue las convenciones ya establecidas del proyecto (`AGENTS.md`, `.cursor/rules/*.mdc`): estructura
  de carpetas, `buildStyles(t: AppTheme)` + `useMemo`, patrones de store Zustand, convenciones SQLite
  (WAL, `localISOString()`), formato COP. No introduzcas Clean/Hexagonal Architecture de servidor —
  este es un frontend puro.
- Respeta las "Reglas inmutables" de `AGENTS.md` sin excepción (offline-first, no-edición de
  transacciones, no datos bancarios sensibles, etc.). Si una tarea de `tasks.md` entra en conflicto
  con una regla inmutable, detente y avisa — no la implementes igual.
- Avanza **tarea por tarea** (`tasks.md`), marcando cada una como completada según avanzas. Respeta el
  orden de dependencias declarado al final de `tasks.md`.
- Barandas: no secretos, no `git push`/deploys/migraciones irreversibles sin autorización explícita,
  no instalar dependencias directamente (muestra el comando `npm install ...` para que el usuario lo
  copie).
- No afirmes que algo quedó validado si no se ejecutó (correr la app, correr tests, etc.).
- Al terminar todas las tareas, sugiere correr `/sdd-test` si el spec tiene `test-plan.md`, y recuerda
  que `/revisar` (wallet-validator + tsc) sigue siendo el paso previo a `/commit`.
