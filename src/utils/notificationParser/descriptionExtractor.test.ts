import { extractDescription, shortenDescription } from "./descriptionExtractor";

describe("extractDescription", () => {
  it("elimina el prefijo de Bancolombia y el monto", () => {
    expect(
      extractDescription("Bancolombia le informa Compra por $45.000 en RAPPI CO.", "Bancolombia"),
    ).toBe("Compra por en RAPPI CO.");
  });

  it("cae al nombre del banco si el texto queda muy corto", () => {
    expect(extractDescription("$1.000", "Nu")).toBe("Nu");
  });

  it("capitaliza la primera letra", () => {
    expect(extractDescription("compra en éxito", "Nu")).toBe("Compra en éxito");
  });
});

describe("shortenDescription", () => {
  it("gasto: usa el verbo 'Compra' cuando el texto lo menciona", () => {
    expect(shortenDescription("Compra por en RAPPI CO.", true)).toBe("Compra en RAPPI CO");
  });

  it("gasto: reconoce 'Comercio: X' y lo normaliza a la preposición 'en'", () => {
    expect(shortenDescription("Debito realizo una compra Comercio: NETFLIX", true)).toBe(
      "Compra en NETFLIX",
    );
  });

  it("gasto: usa 'Pago' cuando el texto menciona pagar (sin la palabra compra)", () => {
    expect(shortenDescription("Pagaste Pagaste en Éxito", true)).toBe("Pago en Éxito");
  });

  it("gasto: usa 'Retiro' cuando el texto lo menciona", () => {
    expect(shortenDescription("Retiro en cajero automático", true)).toBe(
      "Retiro en cajero automático",
    );
  });

  it("gasto: cae a 'Gasto' genérico si no hay verbo reconocible", () => {
    expect(shortenDescription("Transacción en comercio afiliado", true)).toBe(
      "Gasto en comercio afiliado",
    );
  });

  it("ingreso: usa 'Recibiste', NO 'Envío', aunque el texto diga 'enviaron' (isExpense manda, no la keyword)", () => {
    expect(shortenDescription("Te enviaron de Juan Pérez", false)).toBe("Recibiste de Juan Pérez");
  });

  it("ingreso: usa 'Consignación' cuando el texto lo menciona", () => {
    expect(shortenDescription("Consignación de Empresa XYZ", false)).toBe(
      "Consignación de Empresa XYZ",
    );
  });

  it("ingreso: cae a 'Ingreso' genérico si no hay verbo reconocible", () => {
    expect(shortenDescription("Abono en tu cuenta", false)).toBe("Ingreso en tu cuenta");
  });

  it("sin contraparte identificable: devuelve solo el verbo, nunca vacío", () => {
    expect(shortenDescription("Compra aprobada", true)).toBe("Compra");
    expect(shortenDescription("Bancolombia", true)).toBe("Gasto");
  });
});
