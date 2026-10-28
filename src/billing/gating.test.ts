/**
 * Guardia estática de Pro: crear un espacio compartido (volverse dueño) y subir el respaldo deben
 * pasar por `canUse` (src/billing). Si alguien agrega una vía nueva sin la guardia, esto falla.
 *
 * Unirse e invitar a un espacio YA existente NO exigen Pro (monetización Free/Pro,
 * specs/espacios-roles-y-limites/, R5): cada invitación trae usuarios nuevos gratis. Un usuario
 * Free sí tiene un tope de cuántos espacios ajenos puede tener (`requireJoinAllowance`), y las
 * reglas de Firestore ponen el tope de tamaño del espacio (R6) — ver firestore-tests/rules.test.ts.
 */
import { readFileSync } from "fs";
import { join } from "path";

const read = (file: string) => readFileSync(join(__dirname, "..", "..", file), "utf8");

/** Cuerpo de una función exportada: desde su firma hasta la siguiente `export`. */
function body(source: string, name: string): string {
  const start = source.indexOf(`export async function ${name}(`);
  expect(start).toBeGreaterThan(-1);
  const next = source.indexOf("\nexport ", start + 10);
  return source.slice(start, next === -1 ? undefined : next);
}

describe("crear un espacio compartido exige Pro", () => {
  const actions = read("src/sync/spaceActions.ts");
  it("shareList llama requirePro()", () => {
    expect(body(actions, "shareList")).toContain("requirePro()");
  });
});

describe("unirse a un espacio exige solo el tope Free, no Pro", () => {
  const actions = read("src/sync/spaceActions.ts");
  it("joinWithCode llama requireJoinAllowance(), no requirePro()", () => {
    const fn = body(actions, "joinWithCode");
    expect(fn).toContain("requireJoinAllowance(");
    expect(fn).not.toContain("requirePro()");
  });
  it("createInvite no exige Pro (cualquier miembro invita)", () => {
    expect(body(actions, "createInvite")).not.toContain("requirePro()");
  });
});

describe("el respaldo en la nube exige Pro", () => {
  const engine = read("src/sync/engine.ts");
  it("syncOnce consulta canUse('cloudBackup') y solo sube con Pro", () => {
    expect(engine).toContain('canUse("cloudBackup")');
    expect(engine).toMatch(/if \(pro\) \{[\s\S]*?await push\(uid, meta\)/);
  });
});
