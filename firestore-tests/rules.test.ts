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
import { deleteDoc, doc, getDoc, setDoc } from "firebase/firestore";

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

it("fuera de users/ todo se niega, aun con sesión", async () => {
  const db = env.authenticatedContext("ana").firestore();
  await assertFails(setDoc(doc(db, "spaces/s1"), { name: "Viaje" }));
  await assertFails(getDoc(doc(db, "inviteCodes/123456")));
});
