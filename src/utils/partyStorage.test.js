import test from "node:test";
import assert from "node:assert/strict";

import { forgetParty, readRememberedParties, rememberParty } from "./partyStorage.js";

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

test("rememberParty mette la più recente in cima senza doppioni", () => {
    globalThis.localStorage = createLocalStorageStub();

    rememberParty("user-1", { code: "AB3K9Z", name: "Capodanno", role: "bar" });
    rememberParty("user-1", { code: "QW7RT2", name: "Compleanno", role: "cliente" });
    rememberParty("user-1", { code: "ab3k9z", name: "Capodanno", role: "bar" });

    assert.deepEqual(readRememberedParties("user-1"), [
        { code: "AB3K9Z", name: "Capodanno", role: "bar" },
        { code: "QW7RT2", name: "Compleanno", role: "cliente" }
    ]);
});

test("rememberParty tiene al massimo sei feste", () => {
    globalThis.localStorage = createLocalStorageStub();

    for (let index = 0; index < 9; index += 1) {
        rememberParty("user-2", { code: `AAAA${index}Z`, name: `Festa ${index}` });
    }

    const salvate = readRememberedParties("user-2");

    assert.equal(salvate.length, 6);
    assert.equal(salvate[0].code, "AAAA8Z");
});

test("rememberParty ignora codici e utenti mancanti", () => {
    globalThis.localStorage = createLocalStorageStub();

    rememberParty("user-3", { name: "Senza codice" });
    rememberParty("", { code: "AB3K9Z" });

    assert.deepEqual(readRememberedParties("user-3"), []);
});

test("forgetParty toglie solo la festa indicata", () => {
    globalThis.localStorage = createLocalStorageStub();

    rememberParty("user-4", { code: "AB3K9Z", name: "Prima" });
    rememberParty("user-4", { code: "QW7RT2", name: "Seconda" });

    assert.deepEqual(forgetParty("user-4", "ab3k9z"), [
        { code: "QW7RT2", name: "Seconda", role: "cliente" }
    ]);
});

test("readRememberedParties sopravvive a una cache corrotta", () => {
    globalThis.localStorage = createLocalStorageStub();

    localStorage.setItem("parties-user-5", "{ rotto");

    assert.deepEqual(readRememberedParties("user-5"), []);
});
