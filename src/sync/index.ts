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
export {
  shareList,
  createInvite,
  joinWithCode,
  completeJoin,
  leaveSpace,
  removeMember,
  deleteSpace,
  type Invite,
  type JoinResult,
} from "./spaceActions";
export { SpaceError, spaceErrorMessage, type SpaceErrorKind } from "./errors";
export { formatInviteCode, INVITE_LENGTH } from "./spaceMappers";
