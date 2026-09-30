import { addTombstone, EMPTY_TOMBSTONES } from "./tombstonesSlice";

describe("addTombstone", () => {
  it("registra el borrado sin tocar el resto", () => {
    const t1 = addTombstone(EMPTY_TOMBSTONES, "debts", "d1", 100);
    const t2 = addTombstone(t1, "lists", "l1", 200);
    expect(t2).toEqual({
      lists: { l1: 200 },
      paymentMethods: {},
      savingsGoals: {},
      debts: { d1: 100 },
    });
  });

  it("no muta el registro original", () => {
    addTombstone(EMPTY_TOMBSTONES, "savingsGoals", "g1", 100);
    expect(EMPTY_TOMBSTONES.savingsGoals).toEqual({});
  });
});
