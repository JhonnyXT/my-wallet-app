---
description: Implementa código a partir de un spec SDD existente
---

# /sdd-build — Implementar desde Spec

## Instrucciones

Entra en **SDD_MODE**. Si el usuario no indicó qué feature de `specs/` implementar, pregúntalo.

### Paso 1 — Fuente de verdad
Usa `requirements.md`, `design.md` y `tasks.md` de la feature. Si algo no está claro, detente y
sugiere `/sdd-clarify` en vez de asumir.

### Paso 2 — Seguir convenciones del proyecto
Sigue lo ya establecido en `AGENTS.md`/`.cursor/rules/*.mdc`: estructura de carpetas,
`buildStyles(t: AppTheme)` + `useMemo`, patrones de store Zustand, convenciones SQLite (WAL,
`localISOString()`), formato COP. No introduzcas Clean/Hexagonal Architecture de servidor.

### Paso 3 — Reglas inmutables
Respeta sin excepción las "Reglas inmutables" de `AGENTS.md`. Si una tarea de `tasks.md` entra en
conflicto con una regla inmutable, detente y avisa — no la implementes igual.

### Paso 4 — Ejecutar tarea por tarea
Avanza siguiendo el orden de dependencias de `tasks.md`, marcando cada tarea completada.

### Paso 5 — Barandas
No secretos, no `git push`/deploys/migraciones irreversibles sin autorización explícita, no instalar
dependencias directamente (mostrar el comando `npm install ...` para que el usuario lo copie). No
afirmar que algo quedó validado si no se ejecutó.

### Paso 6 — Cierre
Al terminar todas las tareas, sugiere `/sdd-test` si hay `test-plan.md`, y recuerda que `/revisar`
sigue siendo el paso previo a `/commit`.
