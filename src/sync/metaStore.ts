/** Persistencia de `SyncMeta` (AsyncStorage, solo la usa src/sync/). Ver `meta.ts`. */
import AsyncStorage from "@react-native-async-storage/async-storage";
import { emptyMeta, type SyncMeta } from "./meta";

const META_KEY = "mywallet-sync-meta";

export async function loadMeta(): Promise<SyncMeta> {
  try {
    const raw = await AsyncStorage.getItem(META_KEY);
    if (!raw) return emptyMeta();
    const saved = JSON.parse(raw) as Partial<SyncMeta>;
    const base = emptyMeta();
    // `pushed` se une por colección: un meta guardado antes de que existiera una colección
    // (ej. recurrentes) no la trae y `meta.pushed[kind]` quedaría indefinido.
    return { ...base, ...saved, pushed: { ...base.pushed, ...saved.pushed } };
  } catch {
    return emptyMeta();
  }
}

export async function saveMeta(meta: SyncMeta): Promise<void> {
  await AsyncStorage.setItem(META_KEY, JSON.stringify(meta));
}

export async function clearMeta(): Promise<void> {
  await AsyncStorage.removeItem(META_KEY);
}
