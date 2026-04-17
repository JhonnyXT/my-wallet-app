---
description: Crea el scaffold completo de un nuevo módulo (feature) siguiendo la arquitectura Feature-Sliced de MyWallet
---

# /nuevo-feature — Scaffold de Módulo Completo

## Instrucciones

### Paso 1 — Obtener alcance del feature
Preguntar al usuario:
- **Nombre del feature** (ej: "recurring-expenses", "export-pdf")
- **¿Necesita pantalla nueva?** → archivo en `app/`
- **¿Necesita componente UI?** → archivo en `src/components/ui/`
- **¿Necesita store propio?** → archivo en `src/store/`
- **¿Necesita modificar DB?** → migración en `src/db/db.ts`
- **¿Necesita lógica de dominio?** → archivo en `src/features/`

### Paso 2 — Generar archivos
Para cada pieza, activar la skill correspondiente:
- Pantalla → skill `add-screen`
- Componente → skill `add-component`
- Store → plantilla de `useFinanceStore.ts`
- DB → patrón de migraciones de `database.mdc`
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

### Paso 5 — Validar
Ejecutar la skill `wallet-validator` sobre todos los archivos creados.
