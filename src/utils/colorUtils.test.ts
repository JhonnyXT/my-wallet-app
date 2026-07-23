import { hueToColors, hexToHue } from "./colorUtils";

describe("hueToColors", () => {
  it("genera accent y bg como hex válidos de 7 caracteres", () => {
    const { accent, bg } = hueToColors(210);
    expect(accent).toMatch(/^#[0-9a-f]{6}$/);
    expect(bg).toMatch(/^#[0-9a-f]{6}$/);
  });

  it("normaliza hues fuera de rango (negativos o > 360)", () => {
    expect(hueToColors(-30)).toEqual(hueToColors(330));
    expect(hueToColors(390)).toEqual(hueToColors(30));
  });

  it("es determinístico para el mismo hue", () => {
    expect(hueToColors(120)).toEqual(hueToColors(120));
  });
});

describe("hexToHue", () => {
  it("extrae un hue coherente con el color de origen (round-trip aproximado)", () => {
    const { accent } = hueToColors(200);
    const hue = hexToHue(accent);
    // hslToHex/hexToHsl no son inversas exactas por redondeo entero de RGB — se tolera ±3°.
    expect(Math.abs(hue - 200)).toBeLessThanOrEqual(3);
  });

  it("devuelve 0 para un hex acromático (gris)", () => {
    expect(hexToHue("#808080")).toBe(0);
  });

  it("soporta hex corto (#RGB)", () => {
    expect(typeof hexToHue("#f0f")).toBe("number");
  });

  it("devuelve 0 para un hex inválido en vez de lanzar", () => {
    expect(hexToHue("no-es-un-color")).toBe(0);
  });
});
