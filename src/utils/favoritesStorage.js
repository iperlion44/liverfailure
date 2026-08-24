import { writeCache } from "./localCache.js";

export const getFavoritesCacheKey = (uid) => `favorite-drinks-${uid}`;

function getStorage() {
    if (typeof globalThis === "undefined") {
        return null;
    }

    return globalThis.localStorage ?? null;
}

export function readCachedFavorites(uid) {
    if (!uid) {
        return [];
    }

    const storage = getStorage();

    if (!storage) {
        return [];
    }

    try {
        const raw = storage.getItem(getFavoritesCacheKey(uid));

        return raw ? JSON.parse(raw) : [];
    } catch (error) {
        console.error("Errore lettura preferiti cache:", error);
        return [];
    }
}

export function writeCachedFavorites(uid, favorites) {
    if (!uid) {
        return;
    }

    const storage = getStorage();

    if (!storage) {
        return;
    }

    writeCache(
        storage,
        getFavoritesCacheKey(uid),
        favorites,
        "Errore salvataggio preferiti cache:"
    );
}

export function saveFavoriteLocally(uid, drink) {
    if (!uid || !drink) {
        return;
    }

    const currentFavorites = readCachedFavorites(uid);

    const alreadySaved = currentFavorites.some(
        (favorite) => favorite.id === drink.id
    );

    if (alreadySaved) {
        return;
    }

    writeCachedFavorites(uid, [...currentFavorites, drink]);
}

export function removeFavoriteLocally(uid, drinkId) {
    if (!uid || !drinkId) {
        return;
    }

    const currentFavorites = readCachedFavorites(uid);

    writeCachedFavorites(
        uid,
        currentFavorites.filter(
            (favorite) => favorite.id !== drinkId
        )
    );
}

export function mergeFavorites(remoteFavorites = [], localFavorites = []) {
    const map = new Map();

    // metto prima i locali e poi i remoti così i remoti (più aggiornati)
    // sovrascrivono. quelli che esistono solo offline restano comunque
    [...localFavorites, ...remoteFavorites].forEach((drink) => {
        if (!drink || !drink.id) {
            return;
        }

        map.set(drink.id, drink);
    });

    return [...map.values()];
}
