import test from "node:test";
import assert from "node:assert/strict";

import {
    getInventoryCacheKey,
    readCachedInventory,
    writeCachedInventory
} from "./inventoryStorage.js";

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
        }
    };
}

test("writeCachedInventory e readCachedInventory fanno il giro completo", () => {
    globalThis.localStorage = createLocalStorageStub();

    writeCachedInventory("user-1", ["Gin", "Campari"]);

    assert.deepEqual(readCachedInventory("user-1"), ["Gin", "Campari"]);
    assert.equal(localStorage.getItem(getInventoryCacheKey("user-1")), '["Gin","Campari"]');
});

test("readCachedInventory scarta quello che non è una lista di nomi", () => {
    globalThis.localStorage = createLocalStorageStub();

    localStorage.setItem(getInventoryCacheKey("user-2"), '{"non":"una lista"}');
    assert.deepEqual(readCachedInventory("user-2"), []);

    localStorage.setItem(getInventoryCacheKey("user-3"), '["Gin", 42, null]');
    assert.deepEqual(readCachedInventory("user-3"), ["Gin"]);
});

test("readCachedInventory sopravvive a una cache corrotta", () => {
    globalThis.localStorage = createLocalStorageStub();

    localStorage.setItem(getInventoryCacheKey("user-4"), "{ rotto");

    assert.deepEqual(readCachedInventory("user-4"), []);
});

test("senza uid non legge né scrive niente", () => {
    globalThis.localStorage = createLocalStorageStub();

    writeCachedInventory("", ["Gin"]);

    assert.deepEqual(readCachedInventory(""), []);
    assert.equal(localStorage.getItem(getInventoryCacheKey("")), null);
});
