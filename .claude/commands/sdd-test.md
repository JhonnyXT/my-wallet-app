---
description: Genera/ejecuta pruebas desde el test-plan de un spec SDD
argument-hint: <ruta del spec o nombre de la feature>
---

Entra en **SDD_MODE**. Genera y/o ejecuta las pruebas de la feature: $ARGUMENTS (búscala en `specs/`).

- Usa `test-plan.md` como fuente de verdad: una prueba real por cada fila `RF-XXX` → caso de prueba.
- Si el proyecto aún no tiene el framework de testing configurado (`npm test` no existe), dilo
  explícitamente y sugiere correr primero la spec de `jest-testing-framework` en `specs/` (o
  `/sdd jest-testing-framework` si no existe) antes de continuar — no improvises una config de testing
  ad-hoc dentro de esta feature.
- Escribe tests co-locados (`*.test.ts` junto al archivo que prueban), consistente con la convención
  ya establecida.
- Después de escribir los tests, **ejecútalos** (`npm test -- <patrón>`) y reporta el resultado real —
  nunca afirmes "los tests pasan" sin haberlos corrido.
- Actualiza los checkboxes de "Criterios de hecho" en `test-plan.md` según el resultado real de la
  ejecución.
- Si algún test falla por un bug real (no por el test mal escrito), repórtalo y pregunta si se corrige
  ahora (fuera del alcance de "solo generar pruebas") o se deja como tarea de seguimiento.
