/** Persistencia de `SyncMeta` (AsyncStorage, solo la usa src/sync/). Ver `meta.ts`. */
import AsyncStorage from "@react-native-async-storage/async-storage";
import { emptyMeta, type SyncMeta } from "./meta";

const META_KEY = "mywallet-sync-meta";

export async function loadMeta(): Promise<SyncMeta> {
  try {
    const raw = await AsyncStorage.getItem(META_KEY);
    return raw ? { ...emptyMeta(), ...(JSON.parse(raw) as Partial<SyncMeta>) } : emptyMeta();
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
