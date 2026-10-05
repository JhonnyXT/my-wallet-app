import type { TransactionRow } from "@/src/db/db";
import {
  docToItem,
  docToTransaction,
  itemToDoc,
  stripUndefinedDeep,
  tombstoneDoc,
  transactionToDoc,
} from "./mappers";

describe("itemToDoc / docToItem", () => {
  it("quita el id y los opcionales ausentes (Firestore rechaza undefined)", () => {
    const doc = itemToDoc({ id: "m1", name: "Nu", type: "debit", emoji: undefined, updatedAt: 7 });
    expect(doc).toEqual({ name: "Nu", type: "debit", updatedAt: 7, deletedAt: null });
    expect("emoji" in doc).toBe(false);
  });

  it("ida y vuelta conserva el ítem", () => {
    const item = { id: "g1", name: "Moto", emoji: "🏍️", targetAmount: 100, updatedAt: 3 };
    expect(docToItem("g1", itemToDoc(item))).toEqual(item);
  });

  it("tombstone: solo la marca de borrado", () => {
    expect(tombstoneDoc(42)).toEqual({ updatedAt: 42, deletedAt: 42 });
  });
});

describe("transactionToDoc / docToTransaction", () => {
  const row: TransactionRow = {
    id: 9,
    amount: 45000,
    description: "Rappi",
    category_emoji: "🍔",
    date: "2026-09-30T12:00:00.000",
    tags: '["#comida"]',
    payment_method: "savings",
    list_id: "personal",
    paid_by: "",
    uid: "u-1",
    updated_at: 100,
    deleted_at: null,
    sync_state: "pending",
  };

  it("no sube el id local ni el estado de sync", () => {
    const doc = transactionToDoc(row);
    expect(doc).not.toHaveProperty("id");
    expect(doc).not.toHaveProperty("sync_state");
    expect(doc).not.toHaveProperty("uid");
  });

  it("ida y vuelta conserva todo menos lo local", () => {
    const { id: _id, sync_state: _s, ...rest } = row;
    expect(docToTransaction("u-1", transactionToDoc(row))).toEqual(rest);
  });

  it("un borrado sube solo la marca, sin el contenido", () => {
    expect(transactionToDoc({ ...row, updated_at: 200, deleted_at: 200 })).toEqual({
      updatedAt: 200,
      deletedAt: 200,
    });
  });

  it("un borrado baja como marca, con su versión y su fecha", () => {
    const back = docToTransaction("u-1", transactionToDoc({ ...row, updated_at: 200, deleted_at: 200 }));
    expect(back).toEqual({ uid: "u-1", updated_at: 200, deleted_at: 200 });
  });

  it("un borrado viejo que todavía trae contenido baja igual, sin el contenido", () => {
    const legacy = { ...transactionToDoc(row), updatedAt: 200, deletedAt: 200 };
    expect(docToTransaction("u-1", legacy)).toEqual({ uid: "u-1", updated_at: 200, deleted_at: 200 });
  });
});

describe("stripUndefinedDeep", () => {
  it("quita undefined también dentro de arreglos y objetos (Firestore los rechaza)", () => {
    const list = {
      id: "s1",
      members: [{ id: "m", name: "Luis", uid: undefined, status: "guest" }],
      space: { spaceId: "s1", x: undefined },
      updatedAt: 1,
    };
    expect(itemToDoc(list)).toEqual({
      members: [{ id: "m", name: "Luis", status: "guest" }],
      space: { spaceId: "s1" },
      updatedAt: 1,
      deletedAt: null,
    });
    expect(stripUndefinedDeep(null)).toBeNull();
  });
});
