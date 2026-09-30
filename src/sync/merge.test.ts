import { mergeCollection, remoteDocWins, transactionsToApply } from "./merge";
import type { RemoteDoc } from "./mappers";

type Goal = { id: string; name: string; updatedAt: number };

const remote = (
  id: string,
  updatedAt: number,
  extra: Partial<{ name: string; deletedAt: number | null }> = {},
): RemoteDoc<Omit<Goal, "id">> => ({
  id,
  data: { name: extra.name ?? id, updatedAt, deletedAt: extra.deletedAt ?? null },
  serverUpdatedAt: updatedAt,
});

describe("mergeCollection", () => {
  it("agrega lo nuevo de la nube al final, conservando el orden local", () => {
    const out = mergeCollection<Goal>([{ id: "a", name: "A", updatedAt: 5 }], {}, [
      remote("b", 10),
    ]);
    expect(out.items.map((i) => i.id)).toEqual(["a", "b"]);
    expect(out.remoteWon).toEqual(["b"]);
    expect(out.accepted).toEqual({ b: 10 });
  });

  it("gana la edición más reciente", () => {
    const local: Goal[] = [
      { id: "a", name: "local-viejo", updatedAt: 5 },
      { id: "b", name: "local-nuevo", updatedAt: 20 },
    ];
    const out = mergeCollection<Goal>(local, {}, [
      remote("a", 10, { name: "remoto" }),
      remote("b", 15, { name: "remoto-viejo" }),
    ]);
    expect(out.items.map((i) => i.name)).toEqual(["remoto", "local-nuevo"]);
    expect(out.remoteWon).toEqual(["a"]);
    expect(out.accepted).toEqual({ a: 10 });
  });

  it("un borrado remoto más reciente elimina el ítem y deja tombstone", () => {
    const out = mergeCollection<Goal>([{ id: "a", name: "A", updatedAt: 5 }], {}, [
      remote("a", 10, { deletedAt: 10 }),
    ]);
    expect(out.items).toEqual([]);
    expect(out.tombstones).toEqual({ a: 10 });
  });

  it("un borrado remoto más viejo que la edición local no la elimina", () => {
    const out = mergeCollection<Goal>([{ id: "a", name: "A", updatedAt: 20 }], {}, [
      remote("a", 10, { deletedAt: 10 }),
    ]);
    expect(out.items.map((i) => i.id)).toEqual(["a"]);
    expect(out.remoteWon).toEqual([]);
  });

  it("un tombstone local más reciente gana a una edición remota vieja", () => {
    const out = mergeCollection<Goal>([], { a: 30 }, [remote("a", 10)]);
    expect(out.items).toEqual([]);
    expect(out.tombstones).toEqual({ a: 30 });
  });

  it("una edición remota más reciente revive algo borrado localmente", () => {
    const out = mergeCollection<Goal>([], { a: 5 }, [remote("a", 10, { name: "vivo" })]);
    expect(out.items).toEqual([{ id: "a", name: "vivo", updatedAt: 10 }]);
    expect(out.tombstones).toEqual({});
  });

  it("un borrado de algo que nunca estuvo aquí no deja rastro", () => {
    const out = mergeCollection<Goal>([], {}, [remote("x", 10, { deletedAt: 10 })]);
    expect(out.items).toEqual([]);
    expect(out.tombstones).toEqual({});
    expect(out.accepted).toEqual({ x: 10 });
  });

  it("empate: se queda lo local (mismo registro ya sincronizado)", () => {
    const out = mergeCollection<Goal>([{ id: "a", name: "A", updatedAt: 10 }], {}, [
      remote("a", 10, { name: "otro" }),
    ]);
    expect(out.items[0].name).toBe("A");
    expect(out.remoteWon).toEqual([]);
  });

  it("no muta la entrada", () => {
    const local: Goal[] = [{ id: "a", name: "A", updatedAt: 5 }];
    const tomb = { z: 1 };
    mergeCollection<Goal>(local, tomb, [remote("a", 10, { deletedAt: 10 })]);
    expect(local).toEqual([{ id: "a", name: "A", updatedAt: 5 }]);
    expect(tomb).toEqual({ z: 1 });
  });
});

describe("transactionsToApply", () => {
  const tx = (uid: string, updated_at: number, deleted_at: number | null = null) => ({
    uid,
    updated_at,
    deleted_at,
  });
  const local = new Map([
    ["viejo", { updated_at: 5, deleted_at: null }],
    ["nuevo", { updated_at: 50, deleted_at: null }],
    ["borrado", { updated_at: 40, deleted_at: 40 }],
  ]);

  it("aplica nuevas vivas y las que ganan; ignora las que pierden", () => {
    const out = transactionsToApply(local, [
      tx("desconocida", 1),
      tx("viejo", 10),
      tx("nuevo", 20),
      tx("borrado", 30),
    ]);
    expect(out.map((t) => t.uid)).toEqual(["desconocida", "viejo"]);
  });

  it("un borrado remoto más reciente se aplica; uno de algo desconocido no", () => {
    const out = transactionsToApply(local, [tx("viejo", 10, 10), tx("desconocida", 10, 10)]);
    expect(out.map((t) => t.uid)).toEqual(["viejo"]);
  });
});

describe("remoteDocWins", () => {
  it("gana el remoto solo si es más reciente", () => {
    expect(remoteDocWins(5, { updatedAt: 10 })).toBe(true);
    expect(remoteDocWins(10, { updatedAt: 5 })).toBe(false);
    expect(remoteDocWins(10, { updatedAt: 10 })).toBe(false);
    expect(remoteDocWins(10, undefined)).toBe(false);
  });

  it("un perfil nunca editado (0) pierde contra cualquier remoto", () => {
    expect(remoteDocWins(0, { updatedAt: 0 })).toBe(false);
    expect(remoteDocWins(0, { updatedAt: 1 })).toBe(true);
  });
});
