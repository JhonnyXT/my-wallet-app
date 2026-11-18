# 0009 — `CategoryTile` recrea su `PanResponder` en cada render, sin `useRef`

**Fecha:** histórica — documentada ahora en la Fase 4 de la auditoría (2026-11-18), sin ADR ni
mención previa en `AGENTS.md`/`CONTEXT.md`.

## Contexto

`CategoryTile` (`src/components/ui/CategoryPickerGrid.tsx`) detecta con un `PanResponder` si el
toque sobre el ícono de una categoría fue un tap (marcar/desmarcar) o un swipe horizontal (cambiar
de variante de emoji, `onChangeEmojiIdx`). El cálculo del próximo índice de variante
(`(emojiIdx + 1) % variants.length`) depende del `emojiIdx` actual, que cambia en cada render.

## Problema / Decisión

El `PanResponder` se crea de nuevo en cada render (`PanResponder.create({...})` directo en el
cuerpo del componente), sin envolverlo en `useRef`. Es intencional: envolverlo en `useRef` lo crea
una sola vez, y sus callbacks (`onPanResponderRelease`) quedan cerrados sobre el `emojiIdx` del
primer render — el swipe siempre calculaba el próximo índice desde 0 en vez del índice actual, y la
tarjeta se quedaba alternando solo entre la 1ª y la 2ª/última variante sin importar cuántas veces
se deslizara.

## Consecuencias

No envolver este `PanResponder` en `useRef` ni memoizarlo pensando que es una optimización segura
(evitar recrearlo en cada render): reintroduce el bug de índice congelado. Si se necesita evitar la
recreación por rendimiento, hay que pasar `emojiIdx` por una ref que sí se actualice en cada
render (ej. `useRef` sincronizado a mano), no memoizar el objeto `PanResponder` completo.

Código: `src/components/ui/CategoryPickerGrid.tsx` → `CategoryTile`.
