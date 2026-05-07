---
name: add-component
description: |
  Crea un nuevo componente UI reutilizable para MyWallet siguiendo el Stitch Design
  System con tema dinámico light/dark, NativeWind o StyleSheet, y TypeScript estricto.
  Usar cuando el usuario pida "nuevo componente", "crear widget", "componente UI",
  "crear card" o "agregar componente visual". Basado en TransactionItem.tsx,
  CategoryChart.tsx y ToastBanner.tsx como referencia real del proyecto.
license: MIT
metadata:
  project: my-wallet-app
  stack: react-native-expo
---

## When to Use
- El usuario pide crear un componente visual reutilizable.
- Se necesita un widget nuevo para el dashboard o listas.
- Se va a extraer UI de una pantalla a un componente compartido.

## Gotchas
- Los componentes viven en `src/components/ui/` — NUNCA en `app/`.
- Named exports SIEMPRE (`export function`), NO default exports.
- Cada componente tiene su propia función `createStyles(t: AppTheme)` interna, no compartida.
- NO mezclar StyleSheet y NativeWind en el mismo componente.
- Los componentes son agnósticos: reciben datos como props, no leen de stores directamente (salvo tema y settings de categorías).
- `AnimatedNumber`, `ActionPills` y `CustomTabBar` están deprecated — no usarlos como referencia.

## Instructions

### Paso 1 — Crear archivo del componente

Crear `src/components/ui/NombreComponente.tsx`:

```tsx
import { useMemo } from "react";
import { View, Text, StyleSheet } from "react-native";
import { useTheme } from "@/src/context/ThemeContext";
import type { AppTheme } from "@/src/theme";

interface NombreComponenteProps {
  // Definir props con tipos explícitos
  title: string;
  value: number;
  onPress?: () => void;
}

export function NombreComponente({ title, value, onPress }: NombreComponenteProps) {
  const theme = useTheme();
  const st = useMemo(() => createStyles(theme), [theme]);

  return (
    <View style={st.container}>
      <Text style={st.title}>{title}</Text>
      <Text style={st.value}>
        $ {Math.round(Math.abs(value)).toString().replace(/\B(?=(\d{3})+(?!\d))/g, ".")}
      </Text>
    </View>
  );
}

function createStyles(t: AppTheme) {
  return StyleSheet.create({
    container: {
      backgroundColor: t.surface,
      borderRadius: 16,
      padding: 16,
      borderWidth: StyleSheet.hairlineWidth,
      borderColor: t.border,
    },
    title: {
      fontSize: 14,
      color: t.textSub,
      marginBottom: 4,
    },
    value: {
      fontSize: 20,
      fontWeight: "700",
      color: t.text,
    },
  });
}
```

### Paso 2 — Patrón con iconos (lucide)

Si el componente necesita iconos:

```tsx
import { ChevronRight } from "lucide-react-native";

// Dentro del componente:
<ChevronRight size={20} color={theme.textSub} />
```

### Paso 3 — Patrón con swipe-to-delete

Si necesita swipe gesture, usar `Animated` de RN (no Reanimated):

```tsx
import { Animated, PanResponder } from "react-native";

const translateX = useRef(new Animated.Value(0)).current;
const panResponder = useRef(
  PanResponder.create({
    onStartShouldSetPanResponder: () => false,
    onMoveShouldSetPanResponder: (_, g) =>
      Math.abs(g.dx) > 8 && Math.abs(g.dx) > Math.abs(g.dy),
    onPanResponderMove: (_, g) => {
      if (g.dx < 0) translateX.setValue(g.dx);
    },
    onPanResponderRelease: (_, g) => {
      const open = g.dx < -48;
      Animated.spring(translateX, {
        toValue: open ? -72 : 0,
        useNativeDriver: true,
      }).start();
    },
  })
).current;
```

### Paso 4 — Patrón con animaciones de entrada

Usar Reanimated para animaciones de layout:

```tsx
import AnimatedRN, { FadeInDown } from "react-native-reanimated";

<AnimatedRN.View entering={FadeInDown.delay(index * 50).springify()}>
  {/* contenido */}
</AnimatedRN.View>
```

### Verificación rápida
1. Archivo en `src/components/ui/NombreComponente.tsx` (PascalCase).
2. Named export: `export function NombreComponente`.
3. Props tipadas con interface `NombreComponenteProps`.
4. `useTheme()` + `createStyles()` + `useMemo` para dark mode.
5. Montos formateados con regex, NO `toLocaleString()`.
6. Iconos con `lucide-react-native`, colores del tema.

### Paso 5 — Validación final de convenciones
Leer y ejecutar las instrucciones de `.agents/skills/wallet-validator/SKILL.md`
sobre los archivos creados o modificados en los pasos anteriores.
Reportar el resultado con la puntuación (X/12 checks pasados).
