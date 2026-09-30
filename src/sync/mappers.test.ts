import type { TransactionRow } from "@/src/db/db";
import { docToItem, docToTransaction, itemToDoc, tombstoneDoc, transactionToDoc } from "./mappers";

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

  it("un borrado conserva su fecha", () => {
    const back = docToTransaction("u-1", transactionToDoc({ ...row, deleted_at: 200 }));
    expect(back.deleted_at).toBe(200);
  });
});
