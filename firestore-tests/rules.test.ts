/**
 * Reglas de Firestore (firestore.rules) contra el emulador. No corren en `npm test`: necesitan el
 * emulador. Correr con `npm run test:rules` (scripts/test-rules.sh lo levanta y lo apaga).
 */
import { readFileSync } from "fs";
import { join } from "path";
import {
  assertFails,
  assertSucceeds,
  initializeTestEnvironment,
  type RulesTestEnvironment,
} from "@firebase/rules-unit-testing";
import {
  arrayRemove,
  arrayUnion,
  collection,
  deleteDoc,
  doc,
  getDoc,
  getDocs,
  query,
  setDoc,
  Timestamp,
  updateDoc,
  where,
  writeBatch,
} from "firebase/firestore";

let env: RulesTestEnvironment;

beforeAll(async () => {
  env = await initializeTestEnvironment({
    projectId: "demo-mywallet",
    firestore: { rules: readFileSync(join(__dirname, "..", "firestore.rules"), "utf8") },
  });
});

afterAll(() => env.cleanup());
beforeEach(() => env.clearFirestore());

const TX = { amount: 1000, description: "Café", updatedAt: 1 };

describe("users/{uid}", () => {
  it("el dueño lee y escribe sus documentos, también en subcolecciones", async () => {
    const db = env.authenticatedContext("ana").firestore();
    await assertSucceeds(setDoc(doc(db, "users/ana/transactions/t1"), TX));
    await assertSucceeds(getDoc(doc(db, "users/ana/transactions/t1")));
    await assertSucceeds(setDoc(doc(db, "users/ana/meta/profile"), { userName: "Ana" }));
    await assertSucceeds(deleteDoc(doc(db, "users/ana/transactions/t1")));
  });

  it("otro usuario no puede leer ni escribir", async () => {
    await env.withSecurityRulesDisabled(async (ctx) => {
      await setDoc(doc(ctx.firestore(), "users/ana/transactions/t1"), TX);
    });
    const db = env.authenticatedContext("beto").firestore();
    await assertFails(getDoc(doc(db, "users/ana/transactions/t1")));
    await assertFails(setDoc(doc(db, "users/ana/transactions/t2"), TX));
    await assertFails(deleteDoc(doc(db, "users/ana/transactions/t1")));
  });

  it("sin sesión no se puede nada", async () => {
    const db = env.unauthenticatedContext().firestore();
    await assertFails(getDoc(doc(db, "users/ana/transactions/t1")));
    await assertFails(setDoc(doc(db, "users/ana/transactions/t1"), TX));
  });
});

it("fuera de users/ y spaces/ todo se niega, aun con sesión", async () => {
  const db = env.authenticatedContext("ana").firestore();
  await assertFails(setDoc(doc(db, "otra/cosa"), { name: "x" }));
  await assertFails(getDoc(doc(db, "otra/cosa")));
});

// ─── Espacios compartidos (Fase 4, specs/sync-fase-4-espacios/design.md D9) ─────────────────

const IN_7_DAYS = () => Timestamp.fromMillis(Date.now() + 7 * 86400000);
const AGO = () => Timestamp.fromMillis(Date.now() - 1000);
const STX = (createdBy: string) => ({
  amount: 1000,
  description: "Almuerzo",
  paid_by: createdBy,
  createdBy,
  updatedAt: 1,
  deletedAt: null,
});

const as = (uid: string) => env.authenticatedContext(uid).firestore();

/** Espacio "s1" de ana con una persona sin app ("m_luis") y lo que haga falta, sin reglas. */
async function seedSpace(
  opts: {
    memberUids?: string[];
    code?: { id: string; expiresAt: Timestamp; spaceId?: string };
  } = {},
) {
  await env.withSecurityRulesDisabled(async (ctx) => {
    const db = ctx.firestore();
    await setDoc(doc(db, "spaces/s1"), {
      ownerUid: "ana",
      memberUids: opts.memberUids ?? ["ana"],
      deletedAt: null,
    });
    await setDoc(doc(db, "spaces/s1/members/ana"), { name: "Ana", uid: "ana", updatedAt: 1 });
    await setDoc(doc(db, "spaces/s1/members/m_luis"), { name: "Luis", uid: null, updatedAt: 1 });
    await setDoc(doc(db, "spaces/s1/config/list"), { name: "Viaje", emoji: "🏖️", updatedAt: 1 });
    await setDoc(doc(db, "spaces/s1/transactions/t1"), STX("ana"));
    if (opts.code) {
      await setDoc(doc(db, `inviteCodes/${opts.code.id}`), {
        spaceId: opts.code.spaceId ?? "s1",
        createdBy: "ana",
        expiresAt: opts.code.expiresAt,
      });
    }
  });
}

describe("spaces: crear", () => {
  it("el dueño crea espacio, miembros, config y código en un mismo lote", async () => {
    const db = as("ana");
    const batch = writeBatch(db);
    batch.set(doc(db, "spaces/s1"), { ownerUid: "ana", memberUids: ["ana"], deletedAt: null });
    batch.set(doc(db, "spaces/s1/members/ana"), { name: "Ana", uid: "ana", updatedAt: 1 });
    batch.set(doc(db, "spaces/s1/members/m_luis"), { name: "Luis", uid: null, updatedAt: 1 });
    batch.set(doc(db, "spaces/s1/config/list"), { name: "Viaje", updatedAt: 1 });
    await assertSucceeds(batch.commit());
    await assertSucceeds(
      setDoc(doc(db, "inviteCodes/K7Q2MX"), {
        spaceId: "s1",
        createdBy: "ana",
        expiresAt: IN_7_DAYS(),
      }),
    );
  });

  it("no se crea un espacio a nombre de otro ni con otros miembros", async () => {
    const db = as("ana");
    await assertFails(setDoc(doc(db, "spaces/s1"), { ownerUid: "beto", memberUids: ["beto"] }));
    await assertFails(
      setDoc(doc(db, "spaces/s1"), { ownerUid: "ana", memberUids: ["ana", "beto"] }),
    );
  });

  it("un código no pisa otro existente, ni vence en más de 8 días, ni es de un espacio ajeno", async () => {
    await seedSpace({ code: { id: "K7Q2MX", expiresAt: IN_7_DAYS() } });
    const db = as("ana");
    await assertFails(
      setDoc(doc(db, "inviteCodes/K7Q2MX"), {
        spaceId: "s1",
        createdBy: "ana",
        expiresAt: IN_7_DAYS(),
      }),
    );
    await assertFails(
      setDoc(doc(db, "inviteCodes/AAAAAA"), {
        spaceId: "s1",
        createdBy: "ana",
        expiresAt: Timestamp.fromMillis(Date.now() + 30 * 86400000),
      }),
    );
    await assertFails(
      setDoc(doc(as("beto"), "inviteCodes/BBBBBB"), {
        spaceId: "s1",
        createdBy: "beto",
        expiresAt: IN_7_DAYS(),
      }),
    );
  });
});

describe("spaces: leer y escribir", () => {
  it("un miembro lee todo y registra movimientos a su nombre", async () => {
    await seedSpace({ memberUids: ["ana", "beto"] });
    const db = as("beto");
    await assertSucceeds(getDoc(doc(db, "spaces/s1")));
    await assertSucceeds(getDocs(collection(db, "spaces/s1/members")));
    await assertSucceeds(getDoc(doc(db, "spaces/s1/config/list")));
    await assertSucceeds(getDocs(collection(db, "spaces/s1/transactions")));
    await assertSucceeds(setDoc(doc(db, "spaces/s1/transactions/t2"), STX("beto")));
    await assertSucceeds(
      setDoc(doc(db, "spaces/s1/config/list"), { name: "Viaje 2", updatedAt: 2 }),
    );
    // Edita el de otro sin cambiar quién lo creó.
    await assertSucceeds(
      setDoc(doc(db, "spaces/s1/transactions/t1"), { ...STX("ana"), amount: 5 }),
    );
  });

  it("un miembro no registra a nombre de otro ni cambia createdBy", async () => {
    await seedSpace({ memberUids: ["ana", "beto"] });
    const db = as("beto");
    await assertFails(setDoc(doc(db, "spaces/s1/transactions/t2"), STX("ana")));
    await assertFails(setDoc(doc(db, "spaces/s1/transactions/t1"), STX("beto")));
  });

  it("un no miembro no lee ni escribe nada del espacio", async () => {
    await seedSpace();
    const db = as("beto");
    await assertFails(getDoc(doc(db, "spaces/s1")));
    await assertFails(getDocs(collection(db, "spaces/s1/transactions")));
    await assertFails(getDoc(doc(db, "spaces/s1/config/list")));
    await assertFails(setDoc(doc(db, "spaces/s1/transactions/t2"), STX("beto")));
    await assertFails(setDoc(doc(db, "spaces/s1/members/beto"), { name: "Beto", uid: "beto" }));
  });

  it("descubrir: listar solo los espacios donde soy miembro", async () => {
    await seedSpace({ memberUids: ["ana", "beto"] });
    await assertSucceeds(
      getDocs(
        query(collection(as("beto"), "spaces"), where("memberUids", "array-contains", "beto")),
      ),
    );
    await assertFails(getDocs(collection(as("beto"), "spaces")));
  });
});

describe("spaces: unirse con código", () => {
  const join = (uid: string, code: string) =>
    updateDoc(doc(as(uid), "spaces/s1"), { memberUids: arrayUnion(uid), joinCode: code });

  it("con un código vigente de este espacio, se agrega a sí mismo y crea su miembro", async () => {
    await seedSpace({ code: { id: "K7Q2MX", expiresAt: IN_7_DAYS() } });
    await assertSucceeds(getDoc(doc(as("beto"), "inviteCodes/K7Q2MX")));
    await assertSucceeds(join("beto", "K7Q2MX"));
    await assertSucceeds(
      setDoc(doc(as("beto"), "spaces/s1/members/beto"), {
        name: "Beto",
        uid: "beto",
        updatedAt: 1,
      }),
    );
  });

  it("sin código, con uno vencido, inexistente o de otro espacio, no", async () => {
    await seedSpace({ code: { id: "VENCID", expiresAt: AGO() } });
    await env.withSecurityRulesDisabled(async (ctx) => {
      await setDoc(doc(ctx.firestore(), "inviteCodes/OTROSP"), {
        spaceId: "s2",
        createdBy: "ana",
        expiresAt: IN_7_DAYS(),
      });
    });
    await assertFails(updateDoc(doc(as("beto"), "spaces/s1"), { memberUids: arrayUnion("beto") }));
    await assertFails(join("beto", "VENCID"));
    await assertFails(join("beto", "NOEXIS"));
    await assertFails(join("beto", "OTROSP"));
  });

  it("no puede agregar a otra persona, ni a sí mismo y a otra", async () => {
    await seedSpace({ code: { id: "K7Q2MX", expiresAt: IN_7_DAYS() } });
    await assertFails(
      updateDoc(doc(as("beto"), "spaces/s1"), {
        memberUids: arrayUnion("caro"),
        joinCode: "K7Q2MX",
      }),
    );
    await assertFails(
      updateDoc(doc(as("beto"), "spaces/s1"), {
        memberUids: ["ana", "beto", "caro"],
        joinCode: "K7Q2MX",
      }),
    );
  });

  it("no puede volverse dueño ni tocar otros campos al unirse", async () => {
    await seedSpace({ code: { id: "K7Q2MX", expiresAt: IN_7_DAYS() } });
    await assertFails(
      updateDoc(doc(as("beto"), "spaces/s1"), {
        memberUids: arrayUnion("beto"),
        joinCode: "K7Q2MX",
        ownerUid: "beto",
      }),
    );
  });

  it("no se une a un espacio eliminado", async () => {
    await seedSpace({ code: { id: "K7Q2MX", expiresAt: IN_7_DAYS() } });
    await env.withSecurityRulesDisabled(async (ctx) => {
      await updateDoc(doc(ctx.firestore(), "spaces/s1"), { deletedAt: 5 });
    });
    await assertFails(join("beto", "K7Q2MX"));
  });

  it("los códigos no se enumeran", async () => {
    await seedSpace({ code: { id: "K7Q2MX", expiresAt: IN_7_DAYS() } });
    await assertFails(getDocs(collection(as("beto"), "inviteCodes")));
    await assertSucceeds(
      getDocs(query(collection(as("ana"), "inviteCodes"), where("createdBy", "==", "ana"))),
    );
  });
});

describe("spaces: reclamar a una persona sin app", () => {
  it("se liga si está libre; si ya la reclamaron, no", async () => {
    await seedSpace({ memberUids: ["ana", "beto", "caro"] });
    await assertSucceeds(
      updateDoc(doc(as("beto"), "spaces/s1/members/m_luis"), { uid: "beto", joinedAt: 1 }),
    );
    await assertFails(updateDoc(doc(as("caro"), "spaces/s1/members/m_luis"), { uid: "caro" }));
  });

  it("no se puede ligar a otra persona ni crear un miembro con el uid de otro", async () => {
    await seedSpace({ memberUids: ["ana", "beto"] });
    await assertFails(updateDoc(doc(as("beto"), "spaces/s1/members/m_luis"), { uid: "caro" }));
    await assertFails(
      setDoc(doc(as("beto"), "spaces/s1/members/caro"), { name: "Caro", uid: "caro" }),
    );
    // Persona sin app nueva: sí.
    await assertSucceeds(
      setDoc(doc(as("beto"), "spaces/s1/members/m_dani"), {
        name: "Dani",
        uid: null,
        updatedAt: 1,
      }),
    );
  });

  it("solo uno mismo o el dueño editan el miembro de alguien con app", async () => {
    await seedSpace({ memberUids: ["ana", "beto", "caro"] });
    await env.withSecurityRulesDisabled(async (ctx) => {
      await setDoc(doc(ctx.firestore(), "spaces/s1/members/beto"), { name: "Beto", uid: "beto" });
    });
    await assertFails(updateDoc(doc(as("caro"), "spaces/s1/members/beto"), { leftAt: 5 }));
    await assertSucceeds(updateDoc(doc(as("beto"), "spaces/s1/members/beto"), { name: "B" }));
    await assertSucceeds(updateDoc(doc(as("ana"), "spaces/s1/members/beto"), { leftAt: 5 }));
  });
});

describe("spaces: salir, quitar, eliminar", () => {
  it("un miembro sale (leftAt + quitarse en un lote) y deja de leer", async () => {
    await seedSpace({ memberUids: ["ana", "beto"] });
    await env.withSecurityRulesDisabled(async (ctx) => {
      await setDoc(doc(ctx.firestore(), "spaces/s1/members/beto"), { name: "Beto", uid: "beto" });
    });
    const db = as("beto");
    const batch = writeBatch(db);
    batch.update(doc(db, "spaces/s1/members/beto"), { leftAt: 5 });
    batch.update(doc(db, "spaces/s1"), { memberUids: arrayRemove("beto") });
    await assertSucceeds(batch.commit());
    await assertFails(getDocs(collection(db, "spaces/s1/transactions")));
  });

  it("un miembro no quita a otro; el dueño sí, pero no agrega ni se quita a sí mismo", async () => {
    await seedSpace({ memberUids: ["ana", "beto", "caro"] });
    await assertFails(updateDoc(doc(as("beto"), "spaces/s1"), { memberUids: arrayRemove("caro") }));
    await assertFails(updateDoc(doc(as("ana"), "spaces/s1"), { memberUids: arrayUnion("dani") }));
    await assertFails(updateDoc(doc(as("ana"), "spaces/s1"), { memberUids: arrayRemove("ana") }));
    await assertSucceeds(
      updateDoc(doc(as("ana"), "spaces/s1"), { memberUids: arrayRemove("caro") }),
    );
    await assertFails(getDoc(doc(as("caro"), "spaces/s1/config/list")));
  });

  it("el dueño elimina: marca, borra todo y los demás dejan de leer", async () => {
    await seedSpace({ memberUids: ["ana", "beto"] });
    const db = as("ana");
    await assertSucceeds(updateDoc(doc(db, "spaces/s1"), { deletedAt: 5 }));
    // Marcado: el doc se sigue leyendo (para enterarse), lo de adentro ya no.
    await assertSucceeds(getDoc(doc(as("beto"), "spaces/s1")));
    await assertFails(getDocs(collection(as("beto"), "spaces/s1/transactions")));
    await assertSucceeds(deleteDoc(doc(db, "spaces/s1/transactions/t1")));
    await assertSucceeds(deleteDoc(doc(db, "spaces/s1/members/m_luis")));
    await assertSucceeds(deleteDoc(doc(db, "spaces/s1/config/list")));
    await assertSucceeds(deleteDoc(doc(db, "spaces/s1")));
  });

  it("un miembro que no es dueño no elimina ni borra de verdad", async () => {
    await seedSpace({ memberUids: ["ana", "beto"] });
    const db = as("beto");
    await assertFails(updateDoc(doc(db, "spaces/s1"), { deletedAt: 5 }));
    await assertFails(deleteDoc(doc(db, "spaces/s1/transactions/t1")));
    await assertFails(deleteDoc(doc(db, "spaces/s1")));
  });
});
