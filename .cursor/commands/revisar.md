---
description: Ejecuta validación técnica completa del proyecto MyWallet (lint + validador + deuda técnica)
---

# /revisar — Revisión Técnica Completa

## Instrucciones

### Paso 1 — Ejecutar checklist wallet-validator
Activar la skill `wallet-validator` y recorrer los 12 puntos de validación sobre los archivos modificados recientemente.

### Paso 2 — Buscar violaciones automáticas
Ejecutar las búsquedas de la skill:
- `toLocaleString` en archivos `.ts`/`.tsx`
- `toISOString` o `toJSON` en `src/db/`
- `fetch(` o `axios` en `src/` y `app/`
- Colores hardcodeados fuera de `buildStyles`
- `any` innecesarios

### Paso 3 — Verificar tipos TypeScript
```bash
npx tsc --noEmit
```
Reportar cualquier error de tipo.

### Paso 4 — Verificar deuda técnica
Comprobar contra la lista de deuda técnica documentada en `AGENTS.md`.

### Paso 5 — Generar reporte
Mostrar el resultado con formato:
```
Validación MyWallet — [fecha]
Resultado: X/12 checks
[Detalle de cada punto]
[Sugerencias de corrección]
```
