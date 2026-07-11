---
description: Crea un nuevo componente UI siguiendo el Stitch Design System de MyWallet
---

# /nuevo-componente — Scaffold de Componente UI

## Instrucciones

### Paso 1 — Obtener información
Preguntar al usuario:
- **Nombre del componente** (PascalCase)
- **Propósito** (qué muestra o controla)
- **¿Necesita animaciones?** (entrada, swipe, etc.)
- **¿Recibe datos de algún store?**

### Paso 2 — Generar el componente
Activar la skill `add-component` (`.agents/skills/add-component/SKILL.md`) con el contexto proporcionado:
- Crear archivo en `src/components/ui/{NombreComponente}.tsx`
- Usar la plantilla de la skill con las props necesarias
- Aplicar `useTheme()` + `createStyles()` + `useMemo`

### Paso 3 — Validar
Ejecutar los checks del `wallet-validator` sobre el nuevo archivo:
- Props tipadas con interface
- Named export
- Sin colores hardcodeados
- Dark mode con tokens del tema
- Importar icono de lucide si aplica
