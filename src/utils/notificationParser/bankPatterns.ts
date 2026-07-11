import type { BankConfig } from "@/src/constants/banks";
import { extractAmount } from "./amountExtractor";
import { classifyDirection } from "./directionClassifier";
import { extractDescription } from "./descriptionExtractor";
import type { ParsedTransaction, ParseConfidence } from "./types";

export interface BankPattern {
  /** Valida si este patrón aplica a la notificación (ya se sabe que no es ruido) */
  matches: (title: string, text: string) => boolean;
  /** Extrae los campos necesarios */
  parse: (title: string, text: string, bank: BankConfig) => Partial<ParsedTransaction> | null;
}

export const BANCOLOMBIA_PATTERN: BankPattern = {
  matches: (_, text) =>
    /(\$[\d.,]+|débito|debito|compra|retiro|transferencia|recibiste)/i.test(text),
  parse: (_, text, bank) => {
    const amount = extractAmount(text);
    if (!amount) return null;
    const { isExpense, confidence } = classifyDirection(text);
    // "Compra $45.000 en RAPPI CO." → descripción = "RAPPI CO."
    const enMatch = text.match(/\ben\s+([A-ZÁÉÍÓÚa-záéíóú0-9\s.,*&/-]{2,40}?)(?:\.|$|\s+saldo)/i);
    const description = enMatch
      ? enMatch[1].trim()
      : extractDescription(text, bank.displayName);
    return { amount, isExpense, description, confidence };
  },
};

export const NEQUI_PATTERN: BankPattern = {
  matches: (_, text) =>
    /(recibiste|enviaste|pagaste|te enviaron|llegaron|\$[\d.,]+)/i.test(text),
  parse: (title, text, bank) => {
    const amount = extractAmount(text) ?? extractAmount(title);
    if (!amount) return null;
    const { isExpense, confidence } = classifyDirection(text + " " + title);
    // "Pagaste $12.000 en Éxito" → descripción = "Éxito"
    const enMatch = (text + " " + title).match(/\ben\s+([A-ZÁÉÍÓÚa-záéíóú0-9\s.,*&/-]{2,40}?)(?:\.|$)/i);
    // "Te enviaron $80.000 de Juan Pérez" → descripción = "Juan Pérez"
    const deMatch = text.match(/\bde\s+([A-ZÁÉÍÓÚ][a-záéíóú]+(?:\s+[A-ZÁÉÍÓÚ][a-záéíóú]+)?)/);
    const description = enMatch
      ? enMatch[1].trim()
      : deMatch
      ? deMatch[1].trim()
      : extractDescription(text, bank.displayName);
    return { amount, isExpense, description, confidence };
  },
};

export const DAVIVIENDA_PATTERN: BankPattern = {
  matches: (_, text) =>
    /(débito|debito|crédito|credito|comercio|retiro|\$[\d.,]+)/i.test(text),
  parse: (_, text, bank) => {
    const amount = extractAmount(text);
    if (!amount) return null;
    const { isExpense, confidence } = classifyDirection(text);
    // "Comercio: NETFLIX" → descripción = "Netflix"
    const comercioMatch = text.match(/comercio[:\s]+([A-ZÁÉÍÓÚa-záéíóú0-9\s.,*&/-]{2,40}?)(?:\s+saldo|\.|$)/i);
    const description = comercioMatch
      ? comercioMatch[1].trim()
      : extractDescription(text, bank.displayName);
    return { amount, isExpense, description, confidence };
  },
};

export const NU_PATTERN: BankPattern = {
  matches: (title, text) =>
    /(enviaste|recibiste|pagaste|compra|transferencia|\$[\d.,]+)/i.test(title + " " + text),
  parse: (title, text, bank) => {
    const combined = title + " " + text;
    const amount = extractAmount(combined);
    if (!amount) return null;
    const { isExpense, confidence } = classifyDirection(combined);
    // "Le enviaste a JON******* BLA******* en su cuenta de Nequi" → "Transferencia a Nequi"
    const cuentaMatch = combined.match(/en su cuenta de\s+(\w+)/i);
    // "Pagaste en TIENDA XYZ" → "TIENDA XYZ"
    const enMatch = combined.match(/(?:pagaste|compra)\s+(?:en\s+)?([A-ZÁÉÍÓÚa-záéíóú0-9\s.,*&/-]{2,40}?)(?:\.|$|\s+por)/i);
    // "Le enviaste a JON..." → simplificar como transferencia
    const envioMatch = combined.match(/enviaste a\s+([A-ZÁÉÍÓÚ][A-Za-záéíóú*]+)/i);
    let description: string;
    if (cuentaMatch) {
      description = `Transferencia a ${cuentaMatch[1]}`;
    } else if (enMatch) {
      description = enMatch[1].trim();
    } else if (envioMatch) {
      description = `Envío a ${envioMatch[1].replace(/\*+/g, "").trim()}`;
    } else {
      description = extractDescription(combined, bank.displayName);
    }
    return { amount, isExpense, description, confidence };
  },
};

export const GENERIC_PATTERN: BankPattern = {
  matches: (_, text) => /\$[\d.,]+/.test(text),
  parse: (title, text, bank) => {
    const amount = extractAmount(text) ?? extractAmount(title);
    if (!amount) return null;
    const { isExpense } = classifyDirection(text + " " + title);
    const description = extractDescription(text || title, bank.displayName);
    const confidence: ParseConfidence = "medium";
    return { amount, isExpense, description, confidence };
  },
};

/** Mapa de patrones por packageName (los que tienen patrón específico). */
export const BANK_PATTERNS: Record<string, BankPattern> = {
  "co.com.bancolombia.personas.superapp": BANCOLOMBIA_PATTERN,
  "com.nequi.MobileApp":                  NEQUI_PATTERN,
  "com.davivienda.daviviendaapp":         DAVIVIENDA_PATTERN,
  "com.davivienda.daviplataapp":          DAVIVIENDA_PATTERN,
  "com.nu.production":                    NU_PATTERN,
};
