/**
 * Aviso de "cambió algo local que hay que respaldar". Lo emite la capa de datos (db.ts) al
 * escribir y lo escucha la sync (src/sync/engine.ts), sin que ninguna de las dos se importe: así
 * SQLite y los stores no arrastran Firebase (Regla inmutable #1).
 */
type Listener = () => void;

const listeners = new Set<Listener>();

export function emitLocalChange(): void {
  for (const l of listeners) l();
}

export function onLocalChange(listener: Listener): () => void {
  listeners.add(listener);
  return () => listeners.delete(listener);
}
