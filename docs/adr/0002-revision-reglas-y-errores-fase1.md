# 0002 — Revisión de `firestore.rules` y manejo de errores (Fase 1, resto)

**Fecha:** 2026-11-17

## Contexto

Continuación de la Fase 1 de la auditoría (rama `refactor/arquitectura-seguridad`): revisión
completa de `firestore.rules` contra IDOR y mass assignment (más allá del hallazgo ya resuelto en
`spaces/{id}`, ver commit `268b510`), y de manejo de errores en producción.

## Problema / Decisión

**`users/{uid}/{document=**}`**: `allow read, write: if ... request.auth.uid == uid`. Sin
problema — alcance estricto por uid, sin subcolecciones cruzadas.

**`spaces/{id}/members/{memberId}` y `spaces/{id}/config/{doc}`**: no restringen qué campos puede
escribir un miembro (sin `hasOnly`), a diferencia de `spaces/{id}` (ya corregido). Se revisó si esto
es explotable hoy y se decidió **no tocarlo**, por dos motivos:

1. Ningún campo de `members`/`config` tiene hoy significado de permisos — no hay un `role` o
   equivalente que, si se inyectara, cambiara lo que alguien puede hacer. El único documento que
   SÍ decide autorización (`ownerUid`/`memberUids` de `spaces/{id}`) ya quedó protegido.
2. El diseño de espacios es deliberadamente "una lista en papel" (ver `AGENTS.md` → "Espacios
   compartidos": *"Lo que no pueden impedir sin servidor: que un editor edite o borre el movimiento
   de otro editor (a propósito, como una lista en papel)"*). Que cualquier miembro pueda renombrar
   la lista, cambiar el ícono o editar a una persona sin app es la función, no un bug — restringir
   campos ahí cambiaría comportamiento querido, no cerraría un agujero de seguridad real.

**Si en el futuro se agrega un campo con significado de permisos a `members` o `config`** (ej. un
rol por persona, como ya existe en la rama `feature/pro-billing` con `editorUids` en `spaces/{id}`),
reabrir esta decisión: ese campo sí necesitaría la misma protección que se le dio a `ownerUid`.

**`inviteCodes/{code}`**: `allow get` es abierto a cualquier usuario autenticado que conozca el
código exacto (no se pueden enumerar, `allow list` sí está restringido al creador). Esto ya estaba
evaluado y aceptado por el usuario antes de esta auditoría (ver `AGENTS.md` → "Código: 6 caracteres
... sin servidor que limite intentos, un millón de combinaciones se adivina") — no es un hallazgo
nuevo, se confirma que sigue siendo la decisión vigente.

**Manejo de errores en producción**: no aplica igual que en una app con servidor propio (el
checklist genérico de la guía de seguridad está pensado para un backend que le responde a un
cliente por HTTP). Se revisó que:
- Ningún `Alert.alert` muestra `error.message`/`error.stack` crudo al usuario — los errores pasan
  por clasificadores (`classifyAuthError`/`authErrorMessage` en auth, `SpaceError` en espacios) que
  traducen a mensajes en español sin detalle interno.
- Los `console.warn`/`console.error` que quedan (`_layout.tsx`, `engine.ts`, `spaceActions.ts`,
  `useFinanceStore.ts`) no exponen datos sensibles (tokens, texto crudo de notificaciones bancarias)
  y no van a ningún servicio remoto — no hay Sentry/Crashlytics ni logging remoto configurado, así
  que no hay superficie de exposición más allá del propio dispositivo del usuario.

## Consecuencias

- Si se agrega un sistema de logging remoto (Sentry, Crashlytics) en el futuro, revisar de nuevo
  estos `console.warn`/`console.error` — el análisis de "no hay superficie de exposición" deja de
  ser válido en cuanto los logs salgan del dispositivo.
- Si `feature/pro-billing` (roles editor/lector) se fusiona a esta línea de trabajo, revisar que
  `editorUids` en `spaces/{id}` quede dentro del `hasOnly` de `allow create`/`update` — hoy esta
  rama (basada en `master`) no tiene ese campo.

Código: `firestore.rules` (sin cambios adicionales a los de 268b510), `src/components/ui/
AccountSection.tsx` (clasificadores de error ya existentes).
