import test from "node:test";
import assert from "node:assert/strict";

import {
    getFavoritesCacheKey,
    readCachedFavorites,
    saveFavoriteLocally,
    writeCachedFavorites
} from "./favoritesStorage.js";

function createLocalStorageStub() {
    const store = new Map();

    return {
        getItem(key) {
            return store.has(key) ? store.get(key) : null;
        },
        setItem(key, value) {
            store.set(key, String(value));
        },
        removeItem(key) {
            store.delete(key);
        },
        clear() {
            store.clear();
        }
    };
}

test("saveFavoriteLocally salva e deduplica preferiti in cache", () => {
    globalThis.localStorage = createLocalStorageStub();

    const uid = "user-1";
    const drink = { id: "drink-1", name: "Mojito" };

    saveFavoriteLocally(uid, drink);
    saveFavoriteLocally(uid, drink);

    const key = getFavoritesCacheKey(uid);
    const cached = JSON.parse(localStorage.getItem(key));

    assert.deepEqual(cached, [{ id: "drink-1", name: "Mojito" }]);
});

test("writeCachedFavorites e readCachedFavorites leggono correttamente", () => {
    globalThis.localStorage = createLocalStorageStub();

    const uid = "user-2";
    const favorites = [{ id: "a", name: "Aperol" }];

    writeCachedFavorites(uid, favorites);

    assert.deepEqual(readCachedFavorites(uid), favorites);
});
