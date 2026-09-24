# /nuevo-feature — Scaffold de Módulo Completo

## Instrucciones

### Paso 1 — Definir alcance del feature
A partir del pedido, decide qué piezas necesita y dónde viven: pantalla (`app/`), componente UI
(`src/components/ui/`), store (`src/store/`), cambio de DB (migración en `src/db/db.ts`), lógica
de dominio (`src/features/`). Pregunta al usuario solo lo que el pedido no deje claro (típicamente
el nombre, o si hace falta persistir en DB).

### Paso 2 — Generar archivos
Para cada pieza, activar la skill correspondiente:
- Pantalla → skill `add-screen`
- Componente → skill `add-component`
- Store → plantilla de `useFinanceStore.ts`
- DB → patrón de migraciones de `.cursor/rules/database.mdc`
- Feature → crear en `src/features/{nombre}/`

### Paso 3 — Conectar las piezas
1. Si hay pantalla: registrar en `app/_layout.tsx`
2. Si hay store: importar y usar en la pantalla
3. Si hay DB: llamar desde el store, no desde la pantalla
4. Si hay componente: importar en la pantalla

### Paso 4 — Actualizar documentación
- Agregar ruta a la tabla de rutas en `AGENTS.md`
- Si hay store nuevo: agregar a la tabla de stores en `AGENTS.md`
- Actualizar `CONTEXT.md` con la descripción del feature
- O invocar directamente el subagente `generador-docs`

### Paso 5 — Validar
Ejecutar la skill `wallet-validator` sobre todos los archivos creados.
