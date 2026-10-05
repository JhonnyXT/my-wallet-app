import type { TransactionRow } from "@/src/db/db";
import {
  claimableGuests,
  firstName,
  formatInviteCode,
  INVITE_ALPHABET,
  inviteCodeFromBytes,
  membersToLocal,
  normalizeInviteCode,
  paidByToLocal,
  paidByToRemote,
  spaceDocToTransaction,
  transactionToSpaceDoc,
  type SpaceMemberDoc,
} from "./spaceMappers";

describe("código de invitación", () => {
  it("6 caracteres del alfabeto, sin 0/O/1/I", () => {
    const code = inviteCodeFromBytes(new Uint8Array([0, 31, 32, 255, 100, 7]));
    expect(code).toHaveLength(6);
    expect(code).toBe("A9A9EH");
    for (const ch of "0O1I") expect(INVITE_ALPHABET).not.toContain(ch);
    expect(INVITE_ALPHABET).toHaveLength(32);
  });

  it("falla sin bytes suficientes", () => {
    expect(() => inviteCodeFromBytes(new Uint8Array(3))).toThrow();
  });

  it("normaliza minúsculas, espacios y guiones", () => {
    expect(normalizeInviteCode(" k7q 2mx ")).toBe("K7Q2MX");
    expect(normalizeInviteCode("K7Q-2MX")).toBe("K7Q2MX");
  });

  it("rechaza largo distinto o caracteres fuera del alfabeto", () => {
    expect(normalizeInviteCode("K7Q2M")).toBeNull();
    expect(normalizeInviteCode("K7Q2MXX")).toBeNull();
    expect(normalizeInviteCode("K0Q2MX")).toBeNull();
    expect(normalizeInviteCode("KIQ2MX")).toBeNull();
    expect(normalizeInviteCode("")).toBeNull();
  });

  it("se muestra en dos grupos", () => {
    expect(formatInviteCode("K7Q2MX")).toBe("K7Q 2MX");
  });
});

describe("quién pagó", () => {
  it("uno mismo es SELF_PAYER en el teléfono y su id de miembro en la nube", () => {
    expect(paidByToRemote("", "uid-ana")).toBe("uid-ana");
    expect(paidByToLocal("uid-ana", "uid-ana")).toBe("");
  });

  it("los demás quedan igual en los dos sentidos", () => {
    expect(paidByToRemote("m_luis", "uid-ana")).toBe("m_luis");
    expect(paidByToLocal("uid-beto", "uid-ana")).toBe("uid-beto");
  });

  it("reclamar a una persona sin app: su id de siempre pasa a ser 'Tú'", () => {
    // Beto reclamó a "m_luis": lo que Ana registró como pagado por Luis es de Beto.
    expect(paidByToLocal("m_luis", "m_luis")).toBe("");
    expect(paidByToRemote("", "m_luis")).toBe("m_luis");
  });
});

const ROW: TransactionRow = {
  id: 7,
  uid: "tx-1",
  amount: 50000,
  description: "Almuerzo",
  category_emoji: "🍔",
  date: "2026-10-05T12:00:00.000",
  tags: "#viaje",
  payment_method: "cash",
  list_id: "s1",
  paid_by: "",
  updated_at: 100,
  deleted_at: null,
  sync_state: "pending",
} as TransactionRow;

describe("movimientos del espacio", () => {
  it("subir: sin list_id, con quién pagó en la nube", () => {
    const doc = transactionToSpaceDoc(ROW, "uid-ana");
    expect(doc).toEqual({
      amount: 50000,
      description: "Almuerzo",
      category_emoji: "🍔",
      date: "2026-10-05T12:00:00.000",
      tags: "#viaje",
      payment_method: "cash",
      paid_by: "uid-ana",
      updatedAt: 100,
      deletedAt: null,
    });
    expect("list_id" in doc).toBe(false);
  });

  it("el mismo movimiento se ve 'Tú' para quien pagó y con su id para los demás", () => {
    const doc = transactionToSpaceDoc(ROW, "uid-ana");
    expect(spaceDocToTransaction("tx-1", doc, "s1", "uid-ana")).toMatchObject({ paid_by: "" });
    expect(spaceDocToTransaction("tx-1", doc, "s1", "uid-beto")).toMatchObject({ paid_by: "uid-ana" });
  });

  it("bajar: pone la lista local y conserva la versión", () => {
    const tx = spaceDocToTransaction("tx-1", transactionToSpaceDoc(ROW, "uid-ana"), "lista-local", "uid-beto");
    expect(tx).toMatchObject({ uid: "tx-1", list_id: "lista-local", updated_at: 100, deleted_at: null });
  });

  it("subir un borrado: solo la marca, sin el contenido", () => {
    expect(transactionToSpaceDoc({ ...ROW, updated_at: 200, deleted_at: 200 }, "uid-ana")).toEqual({
      updatedAt: 200,
      deletedAt: 200,
    });
  });

  it("bajar un borrado (también uno viejo con contenido): solo la marca", () => {
    const legacy = { ...transactionToSpaceDoc(ROW, "uid-ana"), updatedAt: 200, deletedAt: 200 };
    expect(spaceDocToTransaction("tx-1", legacy, "lista-local", "uid-beto")).toEqual({
      uid: "tx-1",
      updated_at: 200,
      deleted_at: 200,
    });
  });

  it("bajar: campos ausentes con valores seguros", () => {
    const doc = transactionToSpaceDoc(ROW, "uid-ana");
    const partial = { ...doc, tags: undefined, deletedAt: undefined } as unknown as typeof doc;
    expect(spaceDocToTransaction("tx-1", partial, "s1", "uid-beto")).toMatchObject({
      tags: "",
      deleted_at: null,
    });
  });
});

const member = (data: Partial<SpaceMemberDoc>): SpaceMemberDoc => ({
  name: "X",
  uid: null,
  updatedAt: 1,
  ...data,
});

describe("miembros", () => {
  const docs = [
    { id: "uid-ana", data: member({ name: "Ana", uid: "uid-ana" }) },
    { id: "m_luis", data: member({ name: "Luis" }) },
    { id: "uid-beto", data: member({ name: "Beto", uid: "uid-beto" }) },
    { id: "uid-caro", data: member({ name: "Caro", uid: "uid-caro", leftAt: 5 }) },
    { id: "m_dani", data: member({ name: "Dani" }) },
  ];

  it("la lista local no me incluye y marca el estado de cada uno", () => {
    expect(membersToLocal(docs, "uid-ana")).toEqual([
      { id: "uid-beto", name: "Beto", uid: "uid-beto", status: "joined" },
      { id: "m_dani", name: "Dani", uid: null, status: "guest" },
      { id: "m_luis", name: "Luis", uid: null, status: "guest" },
      { id: "uid-caro", name: "Caro", uid: "uid-caro", status: "left" },
    ]);
  });

  it("quien reclamó a una persona sin app tampoco se ve a sí mismo", () => {
    const claimed = docs.map((d) =>
      d.id === "m_luis" ? { ...d, data: { ...d.data, uid: "uid-eva" } } : d,
    );
    const local = membersToLocal(claimed, "m_luis");
    expect(local.map((m) => m.id)).not.toContain("m_luis");
    expect(local.find((m) => m.id === "uid-ana")?.status).toBe("joined");
  });

  it("se pueden reclamar solo las personas sin app que siguen en el espacio", () => {
    expect(claimableGuests(docs).map((m) => m.name)).toEqual(["Dani", "Luis"]);
  });
});

describe("firstName", () => {
  it("nombre de pila de la cuenta, o un nombre por defecto", () => {
    expect(firstName("Jonathan Blandon")).toBe("Jonathan");
    expect(firstName("  Ana  ")).toBe("Ana");
    expect(firstName(null)).toBe("Sin nombre");
    expect(firstName("")).toBe("Sin nombre");
  });
});
