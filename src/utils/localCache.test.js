import test from "node:test";
import assert from "node:assert/strict";

import { writeCache } from "./localCache.js";

function createQuotaLimitedStorage(maxLength) {
    const store = new Map();

    return {
        store,
        getItem(key) {
            return store.has(key) ? store.get(key) : null;
        },
        setItem(key, value) {
            if (String(value).length > maxLength) {
                const error = new Error("quota");
                error.name = "QuotaExceededError";
                throw error;
            }

            store.set(key, String(value));
        }
    };
}

test("writeCache salva la copia completa quando ci sta", () => {
    const storage = createQuotaLimitedStorage(10000);
    const drinks = [{ id: "a", name: "Negroni", image: "data:image/jpeg;base64,AAA" }];

    assert.equal(writeCache(storage, "k", drinks, "errore:"), true);
    assert.deepEqual(JSON.parse(storage.getItem("k")), drinks);
});

test("writeCache ripiega sulle ricette senza foto quando la quota è esaurita", () => {
    const drinks = [
        { id: "a", name: "Negroni", preparation: "Mescola", image: "x".repeat(500) },
        { id: "b", name: "Spritz", preparation: "Versa", image: "y".repeat(500) }
    ];

    // Basta per le ricette, non per le foto.
    const storage = createQuotaLimitedStorage(200);

    assert.equal(writeCache(storage, "k", drinks, "errore:"), true);

    const cached = JSON.parse(storage.getItem("k"));

    assert.deepEqual(cached, [
        { id: "a", name: "Negroni", preparation: "Mescola" },
        { id: "b", name: "Spritz", preparation: "Versa" }
    ]);
});

test("writeCache riporta l'insuccesso se non entra nemmeno senza foto", () => {
    const storage = createQuotaLimitedStorage(1);

    assert.equal(writeCache(storage, "k", [{ id: "a", name: "Negroni" }], "errore:"), false);
    assert.equal(storage.getItem("k"), null);
});
