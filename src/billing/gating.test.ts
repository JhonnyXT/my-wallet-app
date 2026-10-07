/**
 * Guardia estática de Pro: compartir, invitar y unirse a espacios, y subir el respaldo, deben
 * pasar por `canUse` (src/billing). Si alguien agrega una vía nueva sin la guardia, esto falla.
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

describe("espacios compartidos exigen Pro", () => {
  const actions = read("src/sync/spaceActions.ts");
  for (const fn of ["shareList", "createInvite", "joinWithCode"]) {
    it(`${fn} llama requirePro()`, () => {
      expect(body(actions, fn)).toContain("requirePro()");
    });
  }
});

describe("el respaldo en la nube exige Pro", () => {
  const engine = read("src/sync/engine.ts");
  it("syncOnce consulta canUse('cloudBackup') y solo sube con Pro", () => {
    expect(engine).toContain('canUse("cloudBackup")');
    expect(engine).toMatch(/if \(pro\) \{[\s\S]*?await push\(uid, meta\)/);
  });
});
