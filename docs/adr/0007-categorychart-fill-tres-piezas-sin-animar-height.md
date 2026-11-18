# 0007 — El fill de `CategoryChart` nunca anima `height`: tres piezas con `scaleY`

**Fecha:** histórica — documentada ahora en la Fase 4 de la auditoría (2026-11-18), sin ADR ni
mención previa en `AGENTS.md`/`CONTEXT.md`.

## Contexto

Cada barra de `CategoryChart` (`AnimatedBar`) anima su altura al entrar y al comprimirse con el
scroll del Dashboard. Esa altura combina dos efectos: la animación de entrada (`heightAnim`,
0 → altura real) y la compresión por scroll (interpolada sobre `scrollY`).

## Problema / Decisión

Animar `height` directamente en RN fuerza relayout en cada frame (JS/UI bridge, no GPU) y además
rompe el radio de las esquinas: con `borderRadius` fijo, una barra corta queda con esquinas que
parecen casi rectas en vez de redondas (el radio es un % relativo a una altura que ya no es la
real). Usar un solo `scaleY` sobre toda la barra tiene el mismo problema: aplasta el radio junto
con el cuerpo (un radio de 18px termina en ~4px en una barra comprimida).

La solución es partir el fill en tres piezas con transforms de GPU, no reflow:
- Tapa inferior y tapa superior, de tamaño **fijo** (`CAP_H = RADIUS * 2`) — sus esquinas nunca
  se escalan, así que el radio se ve siempre igual de redondo.
- Un cuerpo central que se estira entre las dos tapas (`scaleY` solo sobre el cuerpo).
- Si la altura total es menor a `2 · RADIUS` (muy comprimida), se escala el conjunto completo en
  vez de intentar separar tapas que ya no caben.

## Consecuencias

No "simplificar" animando `height` ni usando un solo `scaleY` sobre toda la barra pensando que es
redundante: ambos casos rompen visualmente el radio de las esquinas en barras cortas o
comprimidas. Cualquier cambio al sistema de alturas de las barras debe preservar el patrón de
tres piezas.

Código: `src/components/ui/CategoryChart.tsx` → `AnimatedBar` (`fillGroupStyle`, `fillBodyStyle`,
`fillTopCapStyle` y las piezas equivalentes que las consumen).
