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
 * deshace por empate); si siguen empatadas, la local (no hay nada que escribir).
 */
export function pickWinner(local: Versioned, remote: Versioned): "local" | "remote" {
  if (remote.updatedAt !== local.updatedAt) {
    return remote.updatedAt > local.updatedAt ? "remote" : "local";
  }
  return isDeleted(remote) && !isDeleted(local) ? "remote" : "local";
}
