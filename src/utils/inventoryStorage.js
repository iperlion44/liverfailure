import { writeCache } from "./localCache.js";

export const getInventoryCacheKey = (uid) => `inventory-${uid}`;

function getStorage() {
    if (typeof globalThis === "undefined") {
        return null;
    }

    return globalThis.localStorage ?? null;
}

export function readCachedInventory(uid) {
    if (!uid) {
        return [];
    }

    const storage = getStorage();

    if (!storage) {
        return [];
    }

    try {
        const raw = storage.getItem(getInventoryCacheKey(uid));
        const parsed = raw ? JSON.parse(raw) : [];

        return Array.isArray(parsed) ? parsed.filter((name) => typeof name === "string") : [];
    } catch (error) {
        console.error("Errore lettura dispensa cache:", error);
        return [];
    }
}

export function writeCachedInventory(uid, inventory) {
    if (!uid) {
        return;
    }

    const storage = getStorage();

    if (!storage) {
        return;
    }

    writeCache(
        storage,
        getInventoryCacheKey(uid),
        Array.isArray(inventory) ? inventory : [],
        "Errore salvataggio dispensa cache:"
    );
}
