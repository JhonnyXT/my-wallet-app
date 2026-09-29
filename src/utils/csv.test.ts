import {
  duplicateKey,
  parseTransactionsCsv,
  splitCsv,
  transactionsToCsv,
  type CsvTransaction,
} from "./csv";

const helpers = {
  categoryName: (e: string) => ({ "🍔": "Comida", "💼": "Salario" })[e] ?? "General",
  accountName: (id: string) => ({ cash: "Efectivo", savings: "Ahorros" })[id] ?? id,
  payerName: (p: string) => ({ m1: "Ana" })[p] ?? "",
};

const txs: CsvTransaction[] = [
  {
    date: "2026-09-29T08:35:06.000",
    amount: 45000,
    description: 'Almuerzo "rápido", con Ana',
    category_emoji: "🍔",
    tags: JSON.stringify(["#viaje", "#familia"]),
    payment_method: "savings",
    paid_by: "m1",
  },
  {
    date: "2026-09-16T08:00:00.000",
    amount: -2600000,
    description: "Pago de nómina",
    category_emoji: "💼",
    tags: "",
    payment_method: "cash",
    paid_by: "",
  },
];

describe("CSV de movimientos", () => {
  it("exporta con encabezado, comillas y montos positivos", () => {
    const csv = transactionsToCsv(txs, helpers);
    const lines = csv.split("\n");
    expect(lines[0]).toBe(
      "fecha,tipo,descripcion,categoria_emoji,categoria,monto,cuenta,etiquetas,pago",
    );
    expect(lines[1]).toBe(
      '2026-09-29T08:35:06.000,Gasto,"Almuerzo ""rápido"", con Ana",🍔,Comida,45000,Ahorros,#viaje #familia,Ana',
    );
    expect(lines[2]).toBe(
      "2026-09-16T08:00:00.000,Ingreso,Pago de nómina,💼,Salario,2600000,Efectivo,,",
    );
  });

  it("ida y vuelta: exportar e importar da los mismos movimientos", () => {
    const { rows, invalid, recognized } = parseTransactionsCsv(transactionsToCsv(txs, helpers));
    expect(recognized).toBe(true);
    expect(invalid).toBe(0);
    expect(rows[0]).toEqual({
      date: "2026-09-29T08:35:06.000",
      amount: 45000,
      description: 'Almuerzo "rápido", con Ana',
      categoryEmoji: "🍔",
      tags: ["#viaje", "#familia"],
      account: "Ahorros",
      payer: "Ana",
    });
    expect(rows[1].amount).toBe(-2600000);
    expect(rows[1].payer).toBe("");
  });

  it("lee el formato anterior de Exportar datos", () => {
    const legacy = [
      "id,fecha,tipo,descripcion,categoria,monto,metodo_pago,tags",
      '12,2026-08-12T13:16:03.000,Ingreso,"Ingreso",🍔,10000,cash,""',
      '9,2026-07-20T00:00:00.000,Gasto,"Almuerzo",🎓,45000,savings,"[""#viaje""]"',
    ].join("\n");
    const { rows, recognized } = parseTransactionsCsv(legacy);
    expect(recognized).toBe(true);
    expect(rows).toHaveLength(2);
    expect(rows[0]).toMatchObject({ amount: -10000, categoryEmoji: "🍔", account: "cash" });
    expect(rows[1]).toMatchObject({ amount: 45000, tags: ["#viaje"], account: "savings" });
  });

  it("cuenta filas inválidas y acepta fechas sin hora y montos con separadores", () => {
    const csv = [
      "fecha,tipo,monto,descripcion",
      "2026-09-01,Gasto,1.250.000,Arriendo",
      "no-es-fecha,Gasto,100,Mal",
      "2026-09-02,Otro,100,Mal",
      "2026-09-03,Gasto,0,Mal",
    ].join("\r\n");
    const { rows, invalid } = parseTransactionsCsv(csv);
    expect(rows).toHaveLength(1);
    expect(rows[0]).toMatchObject({ date: "2026-09-01T12:00:00.000", amount: 1250000 });
    expect(invalid).toBe(3);
  });

  it("un CSV de otra cosa no se reconoce", () => {
    expect(parseTransactionsCsv("nombre,edad\nAna,30").recognized).toBe(false);
  });

  it("splitCsv respeta saltos de línea dentro de comillas y el BOM", () => {
    expect(splitCsv('﻿a,b\n"x\ny",z\n')).toEqual([
      ["a", "b"],
      ["x\ny", "z"],
    ]);
  });

  it("clave de duplicado por fecha, monto y descripción", () => {
    expect(duplicateKey({ date: "2026-09-01T12:00:00.000", amount: 5, description: " a " })).toBe(
      "2026-09-01T12:00:00|5|a",
    );
  });
});
