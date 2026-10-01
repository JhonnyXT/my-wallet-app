// API pública de la capa de sync. Pantallas y hooks importan de aquí, nunca de Firebase.
export { signInWithGoogle, type SessionUser } from "./session";
export {
  startSync,
  syncNow,
  signOutWith,
  deleteAccountAndCloudData,
  resolveAccountConflict,
  pendingChanges,
} from "./engine";
export { useSyncStatus, type SyncPhase } from "./status";
export { useSession } from "./useSession";
export { AuthError, authErrorMessage, classifyAuthError, type AuthErrorKind } from "./errors";
