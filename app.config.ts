import type { ExpoConfig } from "expo/config";

// ─── Build variants ─────────────────────────────────────────────────────────
// Patrón portado de habit-tracker (ver AGENTS.md → Build variants). Cada variant
// tiene su propio applicationId — se instalan una al lado de la otra en el mismo
// dispositivo, cada una con su propia base de datos SQLite.
type Variant = "dev" | "test" | "prod";

const variants = {
  // `dev` conserva el applicationId original (com.mywallet.app): es el que ya
  // está instalado en el dispositivo real del usuario con sus transacciones
  // reales — cambiarlo aquí perdería esos datos (instalaría una app aparte).
  dev: {
    name: "MyWallet (Dev)",
    package: "com.mywallet.app",
    scheme: "mywalletapp",
    iconBackground: "#F59E0B",
  },
  test: {
    name: "MyWallet (Test)",
    package: "com.mywallet.app.test",
    scheme: "mywalletapp-test",
    iconBackground: "#8B5CF6",
  },
  prod: {
    name: "MyWallet",
    package: "com.mywallet",
    scheme: "mywalletapp-prod",
    iconBackground: "#135BEC",
  },
} as const satisfies Record<Variant, unknown>;

function resolveVariant(): Variant {
  const value = process.env.APP_VARIANT ?? "dev";
  if (value in variants) return value as Variant;
  throw new Error(
    `Unknown APP_VARIANT "${value}". Expected one of: ${Object.keys(variants).join(", ")}`,
  );
}

const variant = resolveVariant();
const current = variants[variant];

const config: ExpoConfig = {
  name: current.name,
  slug: "my-wallet-app",
  version: "1.5.0",
  orientation: "portrait",
  icon: "./assets/images/icon.png",
  scheme: current.scheme,
  userInterfaceStyle: "automatic",
  splash: {
    image: "./assets/images/splash-icon.png",
    resizeMode: "contain",
    backgroundColor: current.iconBackground,
  },
  ios: {
    supportsTablet: false,
    bundleIdentifier: current.package,
    infoPlist: {
      ITSAppUsesNonExemptEncryption: false,
    },
  },
  android: {
    package: current.package,
    versionCode: 2,
    softwareKeyboardLayoutMode: "resize",
    adaptiveIcon: {
      foregroundImage: "./assets/images/adaptive-icon.png",
      backgroundColor: current.iconBackground,
    },
  },
  web: {
    bundler: "metro",
    output: "static",
    favicon: "./assets/images/favicon.png",
  },
  plugins: [
    "expo-router",
    [
      "expo-speech-recognition",
      {
        microphonePermission: "MyWallet usa el micrófono para registrar gastos por voz.",
        speechRecognitionPermission: "MyWallet transcribe tu voz localmente para registrar gastos.",
      },
    ],
    "@react-native-community/datetimepicker",
    [
      "expo-notifications",
      {
        icon: "./assets/images/icon.png",
        color: "#135BEC",
        sounds: [],
      },
    ],
    "expo-sharing",
    "./plugins/withAllowBackupDisabled",
    "./plugins/withDisableStartingWindowPreview",
  ],
  experiments: {
    typedRoutes: true,
  },
  extra: {
    eas: {
      projectId: "9c3e0360-d70b-4e86-834b-b5588721abd6",
    },
    router: {},
    appVariant: variant,
  },
  runtimeVersion: {
    policy: "appVersion",
  },
  updates: {
    enabled: false,
  },
  owner: "jhonnyxt",
};

export default config;
