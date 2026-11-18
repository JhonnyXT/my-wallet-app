import { formatTime, getGroup, makeTitle, smoothPath } from "@/src/utils/chatHelpers";

describe("makeTitle", () => {
  it("quita signos de interrogación y exclamación", () => {
    expect(makeTitle("¿Cuánto gasté en comida?")).toBe("Cuánto gasté en comida");
    expect(makeTitle("¡Hola!")).toBe("Hola");
  });

  it("recorta a 34 caracteres con elipsis", () => {
    const largo = "a".repeat(50);
    const title = makeTitle(largo);
    expect(title.length).toBe(35); // 34 + "…"
    expect(title.endsWith("…")).toBe(true);
  });

  it("no agrega elipsis si entra en 34 caracteres", () => {
    expect(makeTitle("gasto de ayer")).toBe("gasto de ayer");
  });
});

describe("formatTime", () => {
  it("formatea HH:MM con cero a la izquierda", () => {
    const d = new Date();
    d.setHours(9, 5, 0, 0);
    expect(formatTime(d.toISOString())).toBe("09:05");
  });

  it("formatea horas de dos dígitos sin recortar", () => {
    const d = new Date();
    d.setHours(23, 59, 0, 0);
    expect(formatTime(d.toISOString())).toBe("23:59");
  });
});

describe("getGroup", () => {
  it("clasifica hoy como HOY", () => {
    expect(getGroup(new Date().toISOString())).toBe("HOY");
  });

  it("clasifica ayer como AYER", () => {
    const ayer = new Date();
    ayer.setDate(ayer.getDate() - 1);
    expect(getGroup(ayer.toISOString())).toBe("AYER");
  });

  it("clasifica cualquier otro día como ANTES", () => {
    const haceUnaSemana = new Date();
    haceUnaSemana.setDate(haceUnaSemana.getDate() - 7);
    expect(getGroup(haceUnaSemana.toISOString())).toBe("ANTES");
  });
});

describe("smoothPath", () => {
  it("devuelve paths vacíos con menos de 2 puntos", () => {
    expect(smoothPath([])).toEqual({ line: "", area: "" });
    expect(smoothPath([{ x: 0, y: 0 }])).toEqual({ line: "", area: "" });
  });

  it("arranca el path en el primer punto", () => {
    const { line } = smoothPath([
      { x: 0, y: 10 },
      { x: 5, y: 20 },
    ]);
    expect(line.startsWith("M 0.0 10.0")).toBe(true);
  });

  it("el área cierra el path hacia abajo (y=96) y vuelve al primer punto", () => {
    const { area } = smoothPath([
      { x: 0, y: 10 },
      { x: 5, y: 20 },
    ]);
    expect(area.endsWith("L 5.0 96 L 0.0 96 Z")).toBe(true);
  });
});
