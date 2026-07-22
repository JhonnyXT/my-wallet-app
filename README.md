# MyWallet

Aplicación personal de control financiero para Android. 100% offline — sin backend, sin cuentas,
sin sincronización en la nube. Todos los datos viven en el propio dispositivo.

🔗 **Landing pública:** https://jhonnyxt.github.io/my-wallet-app/
🔒 **Política de privacidad:** https://jhonnyxt.github.io/my-wallet-app/privacy-policy.html

## Features

- **Dashboard** con balance, gráfica de gastos por categoría y lista de transacciones.
- **Categorías dinámicas**, personalizables por el usuario (emoji + nombre + color).
- **Detección automática de transacciones**: lee las notificaciones de tus apps bancarias
  (Bancolombia, Nequi, Davivienda, DaviPlata, BBVA, Nubank, y otras más) y arma un borrador de
  transacción para que lo confirmes — nunca guarda nada sin tu aprobación.
- **Entrada por voz**: dicta un gasto o ingreso y la app lo interpreta.
- **Chat NLP experimental**: escribe en lenguaje natural ("almuerzo 15000") y la app extrae
  monto, categoría y fecha.
- **Presupuestos por categoría** con alertas push al acercarte o superar el límite.
- **Metas de ahorro** con abonos que se registran como gasto en el balance.
- **Modo oscuro** (sistema / claro / oscuro) en toda la app.

## Stack técnico

| Capa | Tecnología |
|------|-----------|
| Lenguaje | TypeScript (strict) |
| Framework | React Native + Expo (SDK 55) |
| Routing | Expo Router (file-based) |
| Estado | Zustand |
| Base de datos | expo-sqlite (WAL mode), sin ORM |
| Estilos | NativeWind (Tailwind) + StyleSheet |
| Notificaciones | expo-notifications + react-native-android-notification-listener (HeadlessJS) |

## Instalación y arranque

Requisitos: Node.js ≥ 20, Android SDK, Java 17.

```bash
npm install
# si hay conflictos de peer deps (React 19 vs librerías con peer React 18):
npm install --legacy-peer-deps
```

Desarrollo:

```bash
npx expo start          # Metro bundler
npx expo run:android    # build + ejecución directa en dispositivo/emulador
```

Build de producción (APK release):

```bash
cd android
./gradlew assembleRelease
```

El APK queda en `android/app/build/outputs/apk/release/app-release.apk`. Instalar con
`adb install -r <ruta-al-apk>`.

## Estructura del proyecto

```
my-wallet-app/
├── app/            # Rutas (Expo Router): dashboard, chat, modales de gasto/ingreso/voz/ajustes
├── src/
│   ├── components/ # Componentes UI reutilizables
│   ├── db/         # SQLite: esquema, CRUD, queries agregadas
│   ├── services/   # Notificaciones (push + detección bancaria en background)
│   ├── store/      # Stores Zustand
│   ├── theme/       # Tokens de diseño (light/dark)
│   └── utils/       # Formateo de moneda, parser de notificaciones, NLP de voz/texto
├── android/        # Proyecto Android nativo
└── docs/           # Landing pública + política de privacidad (GitHub Pages)
```

## Estado del proyecto

Versión actual: **1.5.0**. Deuda técnica conocida: sin framework de testing configurado, sin
ESLint/Prettier, y el build release todavía firma con la keystore de debug (sin keystore de
producción). Detalle completo en [`AGENTS.md`](./AGENTS.md).

## Documentación

Este README es la puerta de entrada rápida. Para profundizar:

- [`AGENTS.md`](./AGENTS.md) — guía maestra del repo: arquitectura, convenciones, reglas
  inmutables, sistema de agentes IA (Cursor/Claude Code), gotchas técnicos.
- [`CONTEXT.md`](./CONTEXT.md) — contexto técnico exhaustivo: interfaces, flujos, pantallas.
- [`DOCUMENTATION.md`](./DOCUMENTATION.md) — manual de usuario final.
- [`PRODUCT_REQUIREMENTS.md`](./PRODUCT_REQUIREMENTS.md) — historias de usuario y requisitos.

## Licencia

Proyecto personal, sin licencia pública de uso/distribución.
