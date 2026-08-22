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

    try {
        storage.setItem(
            getFavoritesCacheKey(uid),
            JSON.stringify(favorites)
        );
    } catch (error) {
        console.error("Errore salvataggio preferiti cache:", error);
    }
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

    // I dati remoti sono più aggiornati e vanno inseriti per ultimi, così
    // sovrascrivono la cache. Gli id presenti solo in locale (preferiti
    // aggiunti offline, non ancora sincronizzati) restano invariati.
    [...localFavorites, ...remoteFavorites].forEach((drink) => {
        if (!drink || !drink.id) {
            return;
        }

        map.set(drink.id, drink);
    });

    return [...map.values()];
}
