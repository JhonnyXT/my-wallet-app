# 0003 — Fase 3: qué se dividió y qué se dejó intacto a propósito

**Fecha:** 2026-11-17

## Contexto

Fase 3 de la auditoría (rama `refactor/arquitectura-seguridad`): reorganización de archivos
grandes y código muerto, sin cambiar comportamiento.

## Decisión

**Se dividió:**
- `src/features/` (carpeta casi vacía, un solo archivo mal nombrado como hook) → consolidado en
  `src/utils/chatNlp.ts` (commit `95c47c7`).
- `src/components/ui/CategoryChart.tsx` (1295 → 988 líneas): se separaron `BudgetEditModal` y
  `CategoryPopup` — ambos autocontenidos, reciben todo por props — a
  `CategoryChartPopups.tsx` (commit `d1805e8`).
- `app/settings.tsx` (3074 → 655 líneas): 19 componentes privados sin relación entre sí, divididos
  por dominio en `src/components/settings/` (commit `0ace658`): estilos compartidos, piezas
  genéricas, y una sección por feature (categorías/presupuestos, métodos de pago, metas, deudas,
  detección automática, bloqueo biométrico).

**Se revisó y se dejó intacto, por acoplamiento real (no por pereza):**

- **`AnimatedBar`/`GhostBar`/el `CategoryChart` principal** (dentro de `CategoryChart.tsx`, ~870
  líneas): comparten un `PanResponder` con estado de gesto (`consumedRef`, selección
  arriba/abajo del popup) entre la barra individual y el contenedor. `AGENTS.md` ya documenta
  explícitamente: *"El long-press del CategoryChart usa `consumedRef` para que `onTouchEnd` no
  dispare el tap (filtro) después de que `onPanResponderRelease` consumió el gesto. Conservar ese
  flag al modificar el componente."* Dividir esto sin poder probar el gesto en un dispositivo físico
  real (no disponible en esta sesión para una verificación visual) es exactamente el riesgo que la
  Fase 3 pide evitar forzar.

- **`app/(tabs)/index.tsx`** (1920 líneas, el Dashboard): no se tocó. Tiene el mismo patrón de
  gestos compartidos entre piezas (el pan de "deslizar el balance para sincronizar", con
  `useSharedValue` de Reanimated compartidos entre el indicador de sync y el balance — ver
  `AGENTS.md` → "Deslizar el balance para traer cambios") más el filtro de categoría por
  `BackHandler`/`PanResponder` sobre la lista. Es un candidato real para una futura división (ej.
  extraer el bloque de búsqueda, el período, o el balance a sus propios componentes/hooks), pero
  exige verificar las animaciones en un dispositivo físico tras cada paso — no algo para hacer a
  ciegas en una sola pasada de texto. Queda pendiente para una sesión futura con acceso al
  dispositivo.

## Consecuencias

- Si se retoma la división de `app/(tabs)/index.tsx` o de `AnimatedBar`/`GhostBar`, hacerlo paso a
  paso (un bloque por vez) y probar el gesto específico en el Samsung del usuario antes de seguir
  al siguiente — no solo `tsc`/tests, que no cubren gestos ni animación.
- `src/components/settings/` y `src/components/ui/CategoryChartPopups.tsx` siguen el mismo patrón
  de carpeta por dominio que `src/components/dashboard/`/`src/components/chat/` — cualquier
  componente nuevo de Ajustes va ahí, no de vuelta a `app/settings.tsx`.

Código: `app/settings.tsx`, `src/components/settings/*`, `src/components/ui/CategoryChart.tsx`,
`src/components/ui/CategoryChartPopups.tsx`.
