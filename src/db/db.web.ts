export interface TransactionRow {
  id: number;
  amount: number;
  description: string;
  category_emoji: string;
  date: string;
}

// In-memory fallback for web (dev only)
let memoryStore: TransactionRow[] = [];
let memoryIdCounter = 1;

export async function initDatabase(): Promise<void> {
  console.log("Web mode: Initializing in-memory database.");
}

export async function insertTransaction(
  amount: number,
  description: string,
  categoryEmoji: string
): Promise<TransactionRow> {
  const now = new Date().toISOString();
  const tx: TransactionRow = {
    id: memoryIdCounter++,
    amount,
    description,
    category_emoji: categoryEmoji,
    date: now,
  };
  memoryStore.unshift(tx);
  return tx;
}

export async function deleteTransaction(id: number): Promise<void> {
  memoryStore = memoryStore.filter((t) => t.id !== id);
}

export async function getAllTransactions(): Promise<TransactionRow[]> {
  return [...memoryStore];
}

export async function hasAnyTransactions(): Promise<boolean> {
  return memoryStore.length > 0;
}

export async function seedDemoData(): Promise<void> {
  const now = new Date();
  const yesterday = new Date(now);
  yesterday.setDate(yesterday.getDate() - 1);
  function d(base: Date, h: number, m: number) {
    const t = new Date(base);
    t.setHours(h, m, 0, 0);
    return t.toISOString();
  }
  const seed = [
    { amount: 900, description: "Restaurante", emoji: "🍔", date: d(yesterday, 18, 45) },
    { amount: 435, description: "Uber Trip", emoji: "🚗", date: d(yesterday, 16, 20) },
    { amount: 3540, description: "PlayStation Store", emoji: "🎮", date: d(new Date(now.getTime() - 3 * 864e5), 14, 10) },
    { amount: 2250, description: "Zara", emoji: "🛍️", date: d(new Date(now.getTime() - 4 * 864e5), 11, 30) },
    { amount: 3690, description: "Servicios Hogar", emoji: "💡", date: d(new Date(now.getTime() - 5 * 864e5), 9, 0) },
  ];
  for (const tx of seed) {
    const t: TransactionRow = { id: memoryIdCounter++, amount: tx.amount, description: tx.description, category_emoji: tx.emoji, date: tx.date };
    memoryStore.unshift(t);
  }
}

export async function getMonthlyTotal(): Promise<number> {
  const now = new Date();
  const firstDay = new Date(now.getFullYear(), now.getMonth(), 1);
  return memoryStore
    .filter((t) => new Date(t.date) >= firstDay)
    .reduce((sum, t) => sum + t.amount, 0);
}
