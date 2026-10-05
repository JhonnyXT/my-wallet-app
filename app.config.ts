import { existsSync, readFileSync } from "fs";
import type { ExpoConfig } from "expo/config";
import { webClientIdFrom } from "./firebase/googleServices";

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

// ─── Firebase (SYNC_ROADMAP.md, T10) ────────────────────────────────────────
// dev y test comparten el proyecto mywallet-test-jb: dev lo usa solo para el cliente OAuth del
// login (sus datos van al Firebase Emulator, ver src/sync/firebase.ts). prod → mywallet-prod.
const googleServicesFile =
  variant === "prod"
    ? "./firebase/google-services.prod.json"
    : "./firebase/google-services.test.json";

// Google Sign-In (versión gratis) no detecta el webClientId: se saca del mismo JSON al compilar.
// Sin el archivo (clon nuevo) la config sigue resolviendo; el build nativo sí lo exige.
const googleWebClientId = existsSync(googleServicesFile)
  ? webClientIdFrom(JSON.parse(readFileSync(googleServicesFile, "utf8")), current.package)
  : undefined;

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
    // Fijo, NUNCA current.iconBackground: este es el splash nativo de Android que se
    // ve antes de que cargue JS, y debe coincidir con el fondo de AnimatedSplash.tsx
    // (también #135BEC fijo) para que se vea como una sola transición continua. Si
    // usara el color por variant (naranja dev / morado test / azul prod, pensado para
    // distinguir el ícono del launcher) se vería un flash del color "equivocado" antes
    // del splash real — justo el bug reportado 2026-09-02.
    backgroundColor: "#135BEC",
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
    googleServicesFile,
    versionCode: 2,
    softwareKeyboardLayoutMode: "resize",
    // Permisos que agregan librerías o el template y la app no usa (Play los cuestiona, ver
    // PLAY_DATA_SAFETY.md): READ_PHONE_STATE (react-native-android-notification-listener, nunca
    // lo llama), almacenamiento (expo-file-system; el CSV usa la caché privada y el selector del
    // sistema) y SYSTEM_ALERT_WINDOW (template de Expo; el debug lo conserva desde
    // src/debug/AndroidManifest.xml, que tiene prioridad sobre el main al mezclar manifests).
    blockedPermissions: [
      "android.permission.READ_PHONE_STATE",
      "android.permission.READ_EXTERNAL_STORAGE",
      "android.permission.WRITE_EXTERNAL_STORAGE",
      "android.permission.SYSTEM_ALERT_WINDOW",
    ],
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
    [
      "expo-local-authentication",
      {
        faceIDPermission: "MyWallet usa Face ID para desbloquear la app.",
      },
    ],
    "./plugins/withAllowBackupDisabled",
    "./plugins/withDisableStartingWindowPreview",
    "./plugins/withoutNotificationListenerBootReceiver",
    "@react-native-firebase/app",
    "@react-native-firebase/auth",
    "@react-native-google-signin/google-signin",
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
    googleWebClientId,
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
