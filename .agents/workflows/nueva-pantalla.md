# /nueva-pantalla — Scaffold de Pantalla

## Instrucciones

### Paso 1 — Definir la pantalla
Del pedido, deduce nombre (kebab-case), propósito y si necesita store propio, cambios de DB o
componentes nuevos. Pregunta al usuario solo lo que no se pueda deducir.

### Paso 2 — Generar la pantalla
Activar la skill `add-screen` (`.agents/skills/add-screen/SKILL.md`) con el contexto proporcionado:
1. Crear `app/{nombre-pantalla}.tsx`
2. Registrar en `app/_layout.tsx` con `fullScreenModal`
3. Si necesita store → crear `src/store/use{Nombre}Store.ts`
4. Si necesita componentes → crear en `src/components/ui/`
5. Si necesita DB → agregar migración en `src/db/db.ts`

### Paso 3 — Validar
- Ruta registrada en `_layout.tsx`
- `useTheme()` + `buildStyles()` + `useMemo`
- Textos en español
- Default export para la pantalla
- Imports con `@/`
