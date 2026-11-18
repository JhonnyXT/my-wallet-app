/**
 * Guardia estática de Pro: subir el respaldo debe pasar por `canUse` (src/billing). Si alguien
 * agrega una vía nueva sin la guardia, esto falla.
 *
 * Compartir/unirse a un espacio (crear, invitar o unirse) NO exige Pro — mismo criterio que
 * meld-app: es gratis para cualquiera, sin tope de cuántos espacios puede tener un usuario. El
 * único límite es el tamaño máximo de un espacio (`maxMembers` en firestore.rules, protección de
 * costo, ver firestore-tests/rules.test.ts), que no depende del plan de quien se une.
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

describe("compartir/unirse a un espacio es gratis, sin gating de Pro", () => {
  const actions = read("src/sync/spaceActions.ts");
  it("shareList no exige Pro ni ningún tope de espacios", () => {
    const fn = body(actions, "shareList");
    expect(fn).not.toContain("requirePro(");
    expect(fn).not.toContain("canUse(");
  });
  it("joinWithCode no exige Pro ni ningún tope de espacios", () => {
    const fn = body(actions, "joinWithCode");
    expect(fn).not.toContain("requireJoinAllowance(");
    expect(fn).not.toContain("requirePro(");
    expect(fn).not.toContain("canUse(");
  });
  it("createInvite no exige Pro (cualquier miembro invita)", () => {
    expect(body(actions, "createInvite")).not.toContain("requirePro(");
  });
});

describe("el respaldo en la nube exige Pro (los espacios compartidos no)", () => {
  const engine = read("src/sync/engine.ts");
  it("syncOnce consulta canUse('cloudBackup') y lo pasa a push()", () => {
    expect(engine).toContain('canUse("cloudBackup")');
    expect(engine).toMatch(/await push\(uid, meta, pro\)/);
  });
  it("push() solo sube el respaldo personal (SETTINGS_KINDS) si pro es true", () => {
    const start = engine.indexOf("async function push(");
    expect(start).toBeGreaterThan(-1);
    const fn = engine.slice(start, engine.indexOf("\n// ─── Pendientes", start));
    // La guarda `if (pro) {` cubre el bloque de SETTINGS_KINDS (respaldo personal); pushSpaceConfigs
    // y el loop de transacciones de espacio quedan fuera, para que corran siempre.
    expect(fn).toMatch(/if \(pro\) \{[\s\S]*SETTINGS_KINDS/);
    expect(fn.indexOf("pushSpaceConfigs")).toBeGreaterThan(fn.indexOf("SETTINGS_KINDS"));
  });
});
