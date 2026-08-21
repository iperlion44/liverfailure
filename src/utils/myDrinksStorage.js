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

    try {
        storage.setItem(
            getMyDrinksCacheKey(uid),
            JSON.stringify(drinks)
        );
    } catch (error) {
        console.error("Errore salvataggio drink cache:", error);
    }
}
