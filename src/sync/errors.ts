/**
 * Errores de la cuenta, reducidos a lo que la UI necesita para elegir el mensaje. Sin imports de
 * Firebase ni Google Sign-In (se clasifican por su `code`), para poder probarlo en Jest.
 */

export type AuthErrorKind =
  /** El usuario cerró el selector de cuentas: no es un error, no se muestra nada. */
  | "cancelled"
  /** Sin conexión. */
  | "offline"
  /** Teléfono sin Google Play Services (o desactualizado). */
  | "unavailable"
  /** Firebase pide un inicio de sesión reciente (borrar la cuenta). */
  | "recent-login"
  | "unknown";

export class AuthError extends Error {
  constructor(
    readonly kind: AuthErrorKind,
    readonly cause?: unknown,
  ) {
    super(`auth:${kind}`);
  }
}

// Códigos reales en Android: google-signin rechaza con `statusCodes` (12501 = cancelado,
// ASYNC_OP_IN_PROGRESS = doble toque, 7 = CommonStatusCodes.NETWORK_ERROR); Firebase con "auth/…".
// Un doble toque se trata como cancelado: el primer intento sigue su curso.
const CANCELLED = new Set(["12501", "ASYNC_OP_IN_PROGRESS"]);
const OFFLINE = new Set(["auth/network-request-failed", "7"]);
const UNAVAILABLE = new Set(["PLAY_SERVICES_NOT_AVAILABLE"]);

export function classifyAuthError(error: unknown): AuthErrorKind {
  if (error instanceof AuthError) return error.kind;
  const code = String((error as { code?: unknown } | null)?.code ?? "");
  if (CANCELLED.has(code)) return "cancelled";
  if (OFFLINE.has(code)) return "offline";
  if (UNAVAILABLE.has(code)) return "unavailable";
  if (code === "auth/requires-recent-login") return "recent-login";
  return "unknown";
}

/** Texto para el usuario; null = no mostrar nada. */
export function authErrorMessage(kind: AuthErrorKind): string | null {
  switch (kind) {
    case "cancelled":
      return null;
    case "offline":
      return "Necesitas conexión a internet para esto. Puedes seguir usando la app sin cuenta.";
    case "unavailable":
      return "Este teléfono no tiene los servicios de Google necesarios para iniciar sesión.";
    case "recent-login":
      return "Por seguridad, vuelve a elegir tu cuenta de Google para continuar.";
    default:
      return "No se pudo completar. Inténtalo de nuevo en un momento.";
  }
}

// ─── Espacios compartidos (Fase 4) ───────────────────────────────────────────

export type SpaceErrorKind =
  /** Sin conexión o sin respuesta a tiempo: compartir y unirse necesitan el servidor (RF-04). */
  | "offline"
  /** Sin sesión iniciada (RF-03). */
  | "signed-out"
  /** El código no existe, venció o es de un espacio eliminado (RF-07). */
  | "invalid-code"
  /** Otra persona ya se ligó a ese nombre ("soy Ana") antes. */
  | "taken"
  /** Las reglas no lo permiten (ya no es miembro, no es el dueño). */
  | "not-allowed"
  | "unknown";

export class SpaceError extends Error {
  constructor(
    readonly kind: SpaceErrorKind,
    readonly cause?: unknown,
  ) {
    super(`space:${kind}`);
  }
}

export function classifySpaceError(error: unknown): SpaceErrorKind {
  if (error instanceof SpaceError) return error.kind;
  if ((error as { name?: unknown } | null)?.name === "OfflineError") return "offline";
  const code = String((error as { code?: unknown } | null)?.code ?? "");
  if (code.includes("unavailable") || code.includes("deadline-exceeded")) return "offline";
  if (code.includes("permission-denied")) return "not-allowed";
  return "unknown";
}

/** Texto para el usuario, dentro de la hoja que hizo la acción. */
export function spaceErrorMessage(kind: SpaceErrorKind): string {
  switch (kind) {
    case "offline":
      return "Necesitas conexión a internet para esto. Lo demás de la app sigue funcionando.";
    case "signed-out":
      return "Inicia sesión con Google en Ajustes → Cuenta para compartir listas.";
    case "invalid-code":
      return "Ese código no existe o ya venció. Pide uno nuevo.";
    case "taken":
      return "Esa persona ya se unió desde otro teléfono. Únete como otra persona.";
    case "not-allowed":
      return "Ya no tienes acceso a ese espacio.";
    default:
      return "No se pudo completar. Inténtalo de nuevo en un momento.";
  }
}
