/**
 * Resolución de conflictos de la sync (SYNC_ROADMAP.md, decisiones T5/T6): entre dos versiones
 * del mismo registro gana la última edición. Pura, sin red: la capa de sync (`src/sync/`) la
 * usa al bajar cambios.
 */

export interface Versioned {
  /** Última edición, epoch ms. */
  updatedAt: number;
  /** Borrado lógico (tombstone), epoch ms; ausente o null = vivo. */
  deletedAt?: number | null;
}

const isDeleted = (v: Versioned) => v.deletedAt != null;

/**
 * Qué versión conservar. Mayor `updatedAt` gana; en empate gana la borrada (un borrado no se
 * deshace por empate); si siguen empatadas, la local (no hay nada que escribir), salvo en 0.
 *
 * `updatedAt` 0 = nunca editado desde que existe la sync (la lista Personal y el perfil/ajustes
 * de una instalación anterior quedan así). Un teléfono recién instalado también tiene 0 en todo:
 * si el empate en 0 lo ganara lo local, restaurar perdería categorías, período y onboarding. En
 * 0 gana lo respaldado.
 */
export function pickWinner(local: Versioned, remote: Versioned): "local" | "remote" {
  if (remote.updatedAt !== local.updatedAt) {
    return remote.updatedAt > local.updatedAt ? "remote" : "local";
  }
  if (isDeleted(remote) !== isDeleted(local)) return isDeleted(remote) ? "remote" : "local";
  return remote.updatedAt === 0 && !isDeleted(remote) ? "remote" : "local";
}
