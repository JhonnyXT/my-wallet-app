# MyWallet — Mapa de Agentes IA

> **Fuente de verdad** para cualquier agente IA que trabaje en este proyecto.
> Léelo PRIMERO antes de escribir código, crear archivos o tomar decisiones de arquitectura.

## Identidad del Proyecto

| Dato | Valor |
|------|-------|
| **Nombre** | MyWallet |
| **Stack** | React Native 0.83 · Expo SDK 55 · TypeScript 5.9 · Zustand 5 · expo-sqlite · NativeWind 4 |
| **Plataforma** | Android (100% offline, sin backend) |
| **Moneda** | Pesos colombianos ($ COP), puntos de miles, sin decimales |
| **Idioma UI** | Español — código en inglés |
| **Diseño** | Google Stitch Design System · Minimalismo Funcional |
| **Versión** | 1.1.0 |

## Reglas Inmutables

1. **Offline-first**: cero llamadas a APIs externas. SQLite + AsyncStorage son las únicas fuentes de persistencia.
2. **Moneda COP**: formatear con regex custom (`replace(/\B(?=(\d{3})+(?!\d))/g, ".")`), NUNCA `toLocaleString()`.
3. **Fechas locales**: usar `localISOString()` (no `toISOString()`), evitar desfases UTC.
4. **Categorías dinámicas**: consultar siempre `userCategories` del store antes de fallbacks legacy.
5. **No edición de transacciones**: solo crear y eliminar (decisión de diseño).
6. **Git manual**: nunca push automático.

## Mapa de Archivos de Orquestación

| Archivo | Tipo | Scope | Descripción |
|---------|------|-------|-------------|
| `AGENTS.md` (este) | Onboarding | Siempre | Fuente de verdad del proyecto |
| `.cursor/rules/global-context.mdc` | Regla | `alwaysApply: true` | Restricciones globales inmutables |
| `.cursor/rules/database.mdc` | Regla | `src/db/**` | Convenciones SQLite, WAL, fechas ISO |
| `.cursor/rules/ui-styles.mdc` | Regla | `**/*.tsx` | Stitch Design, NativeWind, tema dinámico |
| `.cursor/skills/wallet-validator/SKILL.md` | Skill | Bajo demanda | Validación técnica pre-commit |
| `.cursor/commands/new-feature.md` | Comando | Slash `/new-feature` | Scaffold de módulo Feature-Sliced |

## Arquitectura (Feature-Sliced Simplificado)

```
app/           → Rutas y pantallas (Expo Router). Solo orquestan.
src/store/     → Estado global (Zustand). 5 stores, 1 persistido.
src/db/        → Persistencia SQLite. Capa de datos pura.
src/features/  → Lógica de dominio (NLP, voz).
src/components/ui/ → Componentes reutilizables agnósticos.
src/utils/     → Funciones puras (formateo, parseo).
src/constants/ → Configuración estática (colores, presets).
src/theme/     → Tokens de tema light/dark.
```

## Stores Zustand

| Store | Persistido | Responsabilidad |
|-------|-----------|-----------------|
| `useFinanceStore` | No (cache de SQLite) | Transacciones CRUD |
| `useExpenseStore` | No | Formulario gasto/ingreso en curso |
| `useSettingsStore` | AsyncStorage | Config usuario, categorías, metas, métodos pago |
| `useUIStore` | No | Estado búsqueda |
| `useVoiceStore` | No | Estado reconocimiento de voz |

## Convenciones de Código

- **Componentes**: PascalCase → `CategoryChart.tsx`
- **Hooks/Stores**: camelCase con `use` → `useFinanceStore.ts`
- **Constantes**: UPPER_SNAKE_CASE → `CATEGORY_MAP`
- **Rutas**: kebab-case → `active-expense.tsx`
- **Estilos**: `buildStyles(theme)` + `useMemo` — nunca hardcodear colores
- **Imports**: `@/` para rutas desde la raíz

## Documentación Complementaria

- `CONTEXT.md` — Ventana de contexto técnico completo (~930 líneas)
- `DOCUMENTATION.md` — Guía de usuario
- `PRODUCT_REQUIREMENTS.md` — Requisitos del producto y MVP
