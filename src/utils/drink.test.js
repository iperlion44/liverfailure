import test from "node:test";
import assert from "node:assert/strict";

import {
    buildIngredients,
    countIngredients,
    extractMlValue,
    initialOf,
    normalizeIngredients
} from "./drink.js";

test("normalizeIngredients accetta il testo libero delle ricette vecchie", () => {
    assert.deepEqual(normalizeIngredients("Gin, Acqua tonica"), [
        { name: "Gin", quantity: "" },
        { name: "Acqua tonica", quantity: "" }
    ]);

    assert.deepEqual(normalizeIngredients("- Gin\n- Campari"), [
        { name: "Gin", quantity: "" },
        { name: "Campari", quantity: "" }
    ]);
});

test("normalizeIngredients scarta le voci senza nome", () => {
    assert.deepEqual(
        normalizeIngredients([{ name: "Gin", quantity: "50 ml" }, { quantity: "10 ml" }, null]),
        [{ name: "Gin", quantity: "50 ml" }]
    );
});

test("buildIngredients aggiunge l'unità solo dove c'è una quantità", () => {
    assert.deepEqual(
        buildIngredients({
            alcoholic: [{ name: "Gin", quantity: " 50 " }],
            nonAlcoholic: [{ name: "Acqua tonica", quantity: "100" }],
            extras: [{ name: "Ghiaccio", quantity: " q.b. " }]
        }),
        [
            { name: "Gin", quantity: "50 ml" },
            { name: "Acqua tonica", quantity: "100 ml" },
            { name: "Ghiaccio", quantity: "q.b." }
        ]
    );
});

test("buildIngredients tiene gli ingredienti senza quantità e scarta le righe vuote", () => {
    assert.deepEqual(
        buildIngredients({
            alcoholic: [{ name: "Campari", quantity: "" }, { name: "", quantity: "30" }],
            extras: [{ name: "Oliva", quantity: "" }]
        }),
        [
            { name: "Campari", quantity: "" },
            { name: "Oliva", quantity: "" }
        ]
    );
});

test("extractMlValue prende solo la parte numerica", () => {
    assert.equal(extractMlValue("50 ml"), "50");
    assert.equal(extractMlValue(""), "");
    assert.equal(extractMlValue("q.b."), "");
});

test("countIngredients conta anche il testo libero", () => {
    assert.equal(countIngredients("Gin, Campari, Vermouth rosso"), 3);
    assert.equal(countIngredients([]), 0);
});

test("initialOf ripiega su email e poi su punto interrogativo", () => {
    assert.equal(initialOf({ displayName: "cesso" }), "C");
    assert.equal(initialOf({ email: "tizio@esempio.it" }), "T");
    assert.equal(initialOf(null), "?");
});
