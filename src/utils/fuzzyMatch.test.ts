import { fuzzyIncludes, levenshtein } from "@/src/utils/fuzzyMatch";

describe("levenshtein", () => {
  it("es 0 para strings iguales", () => {
    expect(levenshtein("almuerzo", "almuerzo")).toBe(0);
  });

  it("es el largo del otro string cuando uno está vacío", () => {
    expect(levenshtein("", "casa")).toBe(4);
    expect(levenshtein("casa", "")).toBe(4);
  });

  it("cuenta una sola sustitución", () => {
    expect(levenshtein("casa", "caza")).toBe(1);
  });

  it("cuenta una inserción y una eliminación", () => {
    expect(levenshtein("gato", "gatos")).toBe(1);
    expect(levenshtein("gatos", "gato")).toBe(1);
  });

  it("acumula varias ediciones", () => {
    expect(levenshtein("almuerzo", "almuerso")).toBe(1);
    expect(levenshtein("almuerzo", "almuezo")).toBe(1);
    expect(levenshtein("gimnasio", "jimnasyo")).toBeGreaterThanOrEqual(2);
  });
});

describe("fuzzyIncludes", () => {
  it("matchea exacto como .includes()", () => {
    expect(fuzzyIncludes("pagué el almuerzo hoy", "almuerzo")).toBe(true);
    expect(fuzzyIncludes("pagué el almuerzo hoy", "cine")).toBe(false);
  });

  it("tolera un typo de una letra en palabras de 5-7 caracteres", () => {
    expect(fuzzyIncludes("pagué el almuerso de hoy", "almuerzo")).toBe(true);
  });

  it("tolera hasta 2 ediciones en palabras de 8+ caracteres", () => {
    expect(fuzzyIncludes("fui al jimnasyo", "gimnasio")).toBe(true);
  });

  it("NO tolera typos en keywords cortas (menos de 5 caracteres)", () => {
    // "casa" (4) vs "caza" (4): un typo de keyword corta no debe dar falso positivo.
    expect(fuzzyIncludes("fui a caza", "casa")).toBe(false);
  });

  it("NO aplica fuzzy a keywords de varias palabras", () => {
    expect(fuzzyIncludes("pagué la tarjeta de credito", "tarjeta de credto")).toBe(false);
  });

  it("no matchea si la distancia supera el margen tolerado para ese largo", () => {
    // "almuerzo" (8) tolera hasta 2 ediciones; 3+ ediciones no debe matchear.
    expect(fuzzyIncludes("pagué xyzqrst de hoy", "almuerzo")).toBe(false);
  });

  it("ignora palabras del haystack demasiado cortas para comparar", () => {
    // Palabras de menos de 4 letras en el haystack no entran a la comparación por distancia.
    expect(fuzzyIncludes("un té", "almuerzo")).toBe(false);
  });
});
