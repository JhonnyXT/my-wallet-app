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
    expect(shortenDescription("Compra por en RAPPI CO.", true, 45000)).toBe(
      "Compra en RAPPI CO · $ 45.000",
    );
  });

  it("gasto: reconoce 'Comercio: X' y lo normaliza a la preposición 'en'", () => {
    expect(shortenDescription("Debito realizo una compra Comercio: NETFLIX", true, 38900)).toBe(
      "Compra en NETFLIX · $ 38.900",
    );
  });

  it("gasto: usa 'Pagaste' cuando el texto menciona pagar (sin la palabra compra)", () => {
    expect(shortenDescription("Pagaste Pagaste en Éxito", true, 12000)).toBe(
      "Pagaste en Éxito · $ 12.000",
    );
  });

  it("gasto: usa 'Enviaste' cuando el texto menciona un envío — distinto de 'Pagaste', simétrico con 'Recibiste' del lado ingreso", () => {
    expect(shortenDescription("Enviaste a Juan Pérez", true, 50000)).toBe(
      "Enviaste a Juan Pérez · $ 50.000",
    );
  });

  it("gasto: usa 'Retiro' cuando el texto lo menciona", () => {
    expect(shortenDescription("Retiro en cajero automático", true, 100000)).toBe(
      "Retiro en cajero automático · $ 100.000",
    );
  });

  it("gasto: cae a 'Gasto' genérico si no hay verbo reconocible", () => {
    expect(shortenDescription("Transacción en comercio afiliado", true, 20000)).toBe(
      "Gasto en comercio afiliado · $ 20.000",
    );
  });

  it("ingreso: usa 'Recibiste', NO 'Envío', aunque el texto diga 'enviaron' (isExpense manda, no la keyword)", () => {
    expect(shortenDescription("Te enviaron de Juan Pérez", false, 80000)).toBe(
      "Recibiste de Juan Pérez · $ 80.000",
    );
  });

  it("ingreso: reconoce el remitente ANTES del verbo (\"X te envió\"), no solo \"de X\" al final — bug real del fixture 'Nu — transferencia entrante'", () => {
    expect(shortenDescription("Bancolombia te envió 2.653.381,00", false, 2653381)).toBe(
      "Recibiste de Bancolombia · $ 2.653.381",
    );
  });

  it("ingreso: reconoce 'X te transfirió' (remitente antes del verbo, distinto de 'envió')", () => {
    expect(shortenDescription("Juan Pérez te transfirió", false, 50000)).toBe(
      "Recibiste de Juan Pérez · $ 50.000",
    );
  });

  it("ingreso: usa 'Consignación' cuando el texto lo menciona", () => {
    expect(shortenDescription("Consignación de Empresa XYZ", false, 500000)).toBe(
      "Consignación de Empresa XYZ · $ 500.000",
    );
  });

  it("ingreso: cae a 'Ingreso' genérico si no hay verbo reconocible", () => {
    expect(shortenDescription("Abono en tu cuenta", false, 30000)).toBe(
      "Ingreso en tu cuenta · $ 30.000",
    );
  });

  it("sin contraparte identificable: devuelve verbo + monto, nunca vacío", () => {
    expect(shortenDescription("Compra aprobada", true, 15000)).toBe("Compra · $ 15.000");
    expect(shortenDescription("Bancolombia", true, 5000)).toBe("Gasto · $ 5.000");
  });

  it("siempre incluye el monto formateado en COP, con signo aunque el amount sea negativo", () => {
    expect(shortenDescription("Compra en Rappi", true, -45000)).toBe("Compra en Rappi · $ 45.000");
  });
});
