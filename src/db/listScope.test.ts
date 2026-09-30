/**
 * Guardia estática: toda lectura de `transactions` debe pasar por `LIST_SCOPE_SQL`, que excluye
 * los borrados lógicos y aplica el alcance de la lista activa. Una query nueva sin el filtro
 * mostraría movimientos borrados sin ningún error visible. Se lee el código fuente para no
 * arrastrar expo-sqlite a Jest.
 */
import { readFileSync } from "fs";
import { join } from "path";

// Lecturas que a propósito no filtran: la relectura de una fila por id tras editarla.
const ALLOWED = [/FROM transactions WHERE id = \?/];

function readQueries(file: string): string[] {
  const src = readFileSync(join(__dirname, file), "utf8");
  return (src.match(/`[^`]*`/g) ?? []).filter((sql) =>
    /\bSELECT\b[\s\S]*\bFROM transactions\b/.test(sql),
  );
}

describe.each(["db.ts", "queries.ts"])("lecturas de transactions en %s", (file) => {
  const queries = readQueries(file);

  it("encuentra lecturas que revisar", () => {
    expect(queries.length).toBeGreaterThan(0);
  });

  it.each(queries)("filtra por LIST_SCOPE_SQL: %s", (sql) => {
    if (ALLOWED.some((re) => re.test(sql))) return;
    // `rangeClause` (queries.ts) se arma con LIST_SCOPE_SQL como primera cláusula.
    expect(sql).toMatch(/\$\{(LIST_SCOPE_SQL|rangeClause)\}/);
  });
});

it("LIST_SCOPE_SQL excluye los borrados", () => {
  const src = readFileSync(join(__dirname, "db.ts"), "utf8");
  const def = src.match(/export const LIST_SCOPE_SQL = `([^`]*)`/)?.[1] ?? "";
  expect(def).toContain("deleted_at IS NULL");
});

it("rangeClause de queries.ts parte de LIST_SCOPE_SQL", () => {
  const src = readFileSync(join(__dirname, "queries.ts"), "utf8");
  expect(src).toContain("const clauses: string[] = [LIST_SCOPE_SQL];");
});
