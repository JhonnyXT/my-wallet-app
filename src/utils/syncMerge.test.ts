import { pickWinner } from "./syncMerge";

describe("pickWinner", () => {
  it("gana la edición más reciente", () => {
    expect(pickWinner({ updatedAt: 100 }, { updatedAt: 200 })).toBe("remote");
    expect(pickWinner({ updatedAt: 300 }, { updatedAt: 200 })).toBe("local");
  });

  it("un borrado más viejo pierde contra una edición más nueva", () => {
    expect(pickWinner({ updatedAt: 300 }, { updatedAt: 200, deletedAt: 200 })).toBe("local");
    expect(pickWinner({ updatedAt: 200, deletedAt: 200 }, { updatedAt: 300 })).toBe("remote");
  });

  it("en empate gana el borrado", () => {
    expect(pickWinner({ updatedAt: 100 }, { updatedAt: 100, deletedAt: 100 })).toBe("remote");
    expect(pickWinner({ updatedAt: 100, deletedAt: 100 }, { updatedAt: 100 })).toBe("local");
  });

  it("en empate sin borrados (o ambos borrados) se queda la local", () => {
    expect(pickWinner({ updatedAt: 100 }, { updatedAt: 100 })).toBe("local");
    expect(pickWinner({ updatedAt: 100, deletedAt: null }, { updatedAt: 100 })).toBe("local");
    expect(pickWinner({ updatedAt: 100, deletedAt: 90 }, { updatedAt: 100, deletedAt: 100 })).toBe(
      "local",
    );
  });
});
