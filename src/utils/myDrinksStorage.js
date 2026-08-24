import { writeCache } from "./localCache.js";

export const getMyDrinksCacheKey = (uid) => `my-drinks-${uid}`;

function getStorage() {
    if (typeof globalThis === "undefined") {
        return null;
    }

    return globalThis.localStorage ?? null;
}

export function readCachedMyDrinks(uid) {
    if (!uid) {
        return [];
    }

    const storage = getStorage();

    if (!storage) {
        return [];
    }

    try {
        const raw = storage.getItem(getMyDrinksCacheKey(uid));

        return raw ? JSON.parse(raw) : [];
    } catch (error) {
        console.error("Errore lettura drink cache:", error);
        return [];
    }
}

export function writeCachedMyDrinks(uid, drinks) {
    if (!uid) {
        return;
    }

    const storage = getStorage();

    if (!storage) {
        return;
    }

    writeCache(
        storage,
        getMyDrinksCacheKey(uid),
        drinks,
        "Errore salvataggio drink cache:"
    );
}
