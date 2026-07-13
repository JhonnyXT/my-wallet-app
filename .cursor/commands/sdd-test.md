---
description: Genera/ejecuta pruebas desde el test-plan de un spec SDD
---

# /sdd-test — Generar y Ejecutar Pruebas desde Spec

## Instrucciones

Entra en **SDD_MODE**. Si el usuario no indicó qué feature de `specs/` usar, pregúntalo.

### Paso 1 — Fuente de verdad
Usa `test-plan.md`: una prueba real por cada fila `RF-XXX` → caso de prueba.

### Paso 2 — Verificar prerequisito de tooling
Si el proyecto aún no tiene testing configurado (`npm test` no existe), dilo explícitamente y sugiere
correr primero la spec `jest-testing-framework` en `specs/` (o `/sdd jest-testing-framework` si no
existe) antes de continuar. No improvises una config de testing ad-hoc dentro de esta feature.

### Paso 3 — Escribir tests
Tests co-locados (`*.test.ts` junto al archivo que prueban), consistente con la convención del
proyecto.

### Paso 4 — Ejecutar y reportar
Corre `npm test -- <patrón>` y reporta el resultado real — nunca afirmes que los tests pasan sin
haberlos corrido. Actualiza los checkboxes de "Criterios de hecho" en `test-plan.md` según el
resultado real.

### Paso 5 — Si algo falla
Si un test falla por un bug real (no por el test mal escrito), repórtalo y pregunta si se corrige
ahora o se deja como tarea de seguimiento.
