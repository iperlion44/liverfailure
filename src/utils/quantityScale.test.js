import test from "node:test";
import assert from "node:assert/strict";

import {
    buildShoppingList,
    peopleLabel,
    scaleIngredients,
    scaleQuantity,
    shoppingListText
} from "./quantityScale.js";

test("scaleQuantity moltiplica i millilitri", () => {
    assert.equal(scaleQuantity("50 ml", 4), "200 ml");
    assert.equal(scaleQuantity("30 ml", 2), "60 ml");
});

test("scaleQuantity moltiplica anche le unità scritte a parole", () => {
    assert.equal(scaleQuantity("2 spicchi", 3), "6 spicchi");
    assert.equal(scaleQuantity("1", 5), "5");
});

test("scaleQuantity lascia stare quello che non è un numero", () => {
    assert.equal(scaleQuantity("q.b.", 4), "q.b.");
    assert.equal(scaleQuantity("a occhio", 10), "a occhio");
    assert.equal(scaleQuantity("", 4), "");
});

test("scaleQuantity non tocca niente per una persona o per valori assurdi", () => {
    assert.equal(scaleQuantity("50 ml", 1), "50 ml");
    assert.equal(scaleQuantity("50 ml", 0), "50 ml");
    assert.equal(scaleQuantity("50 ml", "tanti"), "50 ml");
});

test("scaleQuantity tiene una sola cifra decimale con la virgola", () => {
    assert.equal(scaleQuantity("2,5 ml", 3), "7,5 ml");
    assert.equal(scaleQuantity("2,5 ml", 2), "5 ml");
});

test("scaleIngredients scala la ricetta intera", () => {
    assert.deepEqual(
        scaleIngredients(
            [
                { name: "Gin", quantity: "50 ml" },
                { name: "Ghiaccio", quantity: "q.b." }
            ],
            3
        ),
        [
            { name: "Gin", quantity: "150 ml" },
            { name: "Ghiaccio", quantity: "q.b." }
        ]
    );
});

test("buildShoppingList somma le righe doppie con la stessa unità", () => {
    assert.deepEqual(
        buildShoppingList(
            [
                { name: "Gin", quantity: "30 ml" },
                { name: "Gin", quantity: "20 ml" },
                { name: "Campari", quantity: "25 ml" }
            ],
            2
        ),
        [
            { name: "Gin", quantity: "100 ml" },
            { name: "Campari", quantity: "50 ml" }
        ]
    );
});

test("buildShoppingList non somma unità diverse e tiene la prima", () => {
    assert.deepEqual(
        buildShoppingList(
            [
                { name: "Menta fresca", quantity: "6 foglie" },
                { name: "Menta fresca", quantity: "1 rametto" }
            ],
            2
        ),
        [{ name: "Menta fresca", quantity: "12 foglie" }]
    );
});

test("buildShoppingList elenca anche gli ingredienti senza quantità", () => {
    assert.deepEqual(buildShoppingList([{ name: "Ghiaccio", quantity: "" }], 4), [
        { name: "Ghiaccio", quantity: "" }
    ]);
});

test("shoppingListText scrive una riga per ingrediente", () => {
    assert.equal(
        shoppingListText([
            { name: "Gin", quantity: "200 ml" },
            { name: "Ghiaccio", quantity: "" }
        ]),
        "Gin — 200 ml\nGhiaccio"
    );
});

test("peopleLabel accorda singolare e plurale", () => {
    assert.equal(peopleLabel(1), "1 persona");
    assert.equal(peopleLabel(6), "6 persone");
});
