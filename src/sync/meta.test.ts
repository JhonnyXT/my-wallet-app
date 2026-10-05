import {
  advanceCursor,
  belongsToOtherAccount,
  emptyMeta,
  forgetSpace,
  markPushed,
  needsPush,
  pendingItems,
  spaceCursorKey,
  trackBanks,
} from "./meta";

describe("needsPush", () => {
  it("nunca subido o más nuevo que lo subido", () => {
    expect(needsPush(undefined, 0)).toBe(true);
    expect(needsPush(5, 10)).toBe(true);
    expect(needsPush(10, 10)).toBe(false);
    expect(needsPush(10, 5)).toBe(false);
  });
});

describe("pendingItems", () => {
  it("separa ediciones y borrados pendientes", () => {
    const out = pendingItems(
      [
        { id: "a", updatedAt: 10 },
        { id: "b", updatedAt: 5 },
      ],
      { c: 20, d: 7 },
      { a: 5, b: 5, d: 7 },
    );
    expect(out.upserts.map((i) => i.id)).toEqual(["a"]);
    expect(out.deletes).toEqual([{ id: "c", deletedAt: 20 }]);
  });
});

describe("markPushed", () => {
  it("combina versiones sin perder las anteriores", () => {
    const m = markPushed(markPushed(emptyMeta(), "debts", { a: 1 }), "debts", { b: 2 });
    expect(m.pushed.debts).toEqual({ a: 1, b: 2 });
    expect(m.pushed.lists).toEqual({});
  });
});

describe("advanceCursor", () => {
  it("solo avanza", () => {
    const m1 = advanceCursor(emptyMeta(), "transactions", 100);
    expect(m1.cursors.transactions).toBe(100);
    expect(advanceCursor(m1, "transactions", 50)).toBe(m1);
    expect(advanceCursor(m1, "transactions", 150).cursors.transactions).toBe(150);
  });
});

describe("trackBanks", () => {
  it("primera vez: versión 0 (la nube gana al restaurar)", () => {
    expect(trackBanks(emptyMeta(), ["nequi"], 999).banks).toEqual({
      value: ["nequi"],
      updatedAt: 0,
    });
  });

  it("si cambia, la versión es ahora; si no, no cambia nada", () => {
    const m = trackBanks(emptyMeta(), ["nequi"], 1);
    expect(trackBanks(m, ["nequi"], 50)).toBe(m);
    expect(trackBanks(m, ["nequi", "bancolombia"], 50).banks).toEqual({
      value: ["nequi", "bancolombia"],
      updatedAt: 50,
    });
  });
});

describe("belongsToOtherAccount", () => {
  it("solo si ya había dueño y es otro", () => {
    expect(belongsToOtherAccount(emptyMeta(), "a")).toBe(false);
    expect(belongsToOtherAccount({ ...emptyMeta(), ownerUid: "a" }, "a")).toBe(false);
    expect(belongsToOtherAccount({ ...emptyMeta(), ownerUid: "a" }, "b")).toBe(true);
  });
});

describe("espacios", () => {
  it("cursor propio por espacio y olvidarlo al desconectar o volver a unirse", () => {
    let meta = advanceCursor(emptyMeta(), spaceCursorKey("s1"), 500);
    meta = advanceCursor(meta, spaceCursorKey("s2"), 700);
    meta = { ...meta, pushedSpaces: { s1: 9, s2: 9 } };
    const out = forgetSpace(meta, "s1");
    expect(out.cursors).toEqual({ "space:s2": 700 });
    expect(out.pushedSpaces).toEqual({ s2: 9 });
  });
});
