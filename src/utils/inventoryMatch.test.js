import test from "node:test";
import assert from "node:assert/strict";

import {
    MATCH_ALMOST,
    MATCH_FAR,
    MATCH_READY,
    buildChecklist,
    isMakeable,
    matchDrink,
    matchLabel,
    missingIngredients
} from "./inventoryMatch.js";

const negroni = [
    { name: "Gin", quantity: "30 ml" },
    { name: "Campari", quantity: "30 ml" },
    { name: "Vermouth rosso", quantity: "30 ml" },
    { name: "Scorza d'arancia", quantity: "1" }
];

test("matchDrink riconosce i drink che posso già fare", () => {
    const dispensa = ["Gin", "Campari", "Vermouth rosso", "Scorza d'arancia", "Vodka"];
    const match = matchDrink(negroni, dispensa);

    assert.equal(match.status, MATCH_READY);
    assert.equal(match.missingCount, 0);
    assert.equal(matchLabel(match), "Puoi farlo ora");
});

test("matchDrink segnala uno o due ingredienti mancanti", () => {
    const unoSolo = matchDrink(negroni, ["Gin", "Campari", "Vermouth rosso"]);

    assert.equal(unoSolo.status, MATCH_ALMOST);
    assert.equal(matchLabel(unoSolo), "1 mancante");

    const dueMancanti = matchDrink(negroni, ["Gin", "Campari"]);

    assert.equal(dueMancanti.status, MATCH_ALMOST);
    assert.equal(matchLabel(dueMancanti), "2 mancanti");
});

test("matchDrink non evidenzia niente oltre i due mancanti", () => {
    const match = matchDrink(negroni, ["Gin"]);

    assert.equal(match.status, MATCH_FAR);
    assert.equal(match.missingCount, 3);
    assert.equal(matchLabel(match), "");
});

test("matchDrink resta muto con la dispensa vuota o senza ingredienti", () => {
    assert.equal(matchDrink(negroni, []).status, MATCH_FAR);
    assert.equal(matchDrink([], ["Gin"]).status, MATCH_FAR);
});

test("missingIngredients non ripete lo stesso ingrediente due volte", () => {
    const doppio = [
        { name: "Gin", quantity: "30 ml" },
        { name: "Gin", quantity: "20 ml" },
        { name: "Campari", quantity: "30 ml" }
    ];

    assert.deepEqual(
        missingIngredients(doppio, ["Campari"]).map((ingredient) => ingredient.name),
        ["Gin"]
    );
});

test("missingIngredients legge anche gli ingredienti in testo libero", () => {
    assert.deepEqual(
        missingIngredients("Gin, Campari", ["Gin"]).map((ingredient) => ingredient.name),
        ["Campari"]
    );
});

test("isMakeable copre sia il pronto che il quasi", () => {
    assert.equal(isMakeable(matchDrink(negroni, ["Gin", "Campari", "Vermouth rosso", "Scorza d'arancia"])), true);
    assert.equal(isMakeable(matchDrink(negroni, ["Gin", "Campari"])), true);
    assert.equal(isMakeable(matchDrink(negroni, ["Gin"])), false);
    assert.equal(isMakeable(null), false);
});

test("buildChecklist segna ingrediente per ingrediente", () => {
    assert.deepEqual(buildChecklist([{ name: "Gin", quantity: "50 ml" }], ["Gin"]), [
        { name: "Gin", quantity: "50 ml", owned: true }
    ]);

    assert.deepEqual(buildChecklist([{ name: "Rum bianco", quantity: "" }], ["Gin"]), [
        { name: "Rum bianco", quantity: "", owned: false }
    ]);
});
