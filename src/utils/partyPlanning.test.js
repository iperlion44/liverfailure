import test from "node:test";
import assert from "node:assert/strict";

import { buildMenuShoppingList, combinedPantry, menuIngredients } from "./partyPlanning.js";

const negroni = {
    ingredients: [
        { name: "Gin", quantity: "30 ml" },
        { name: "Vermouth rosso", quantity: "30 ml" },
        { name: "Bitter", quantity: "30 ml" },
        { name: "Scorza d'arancia", quantity: "" }
    ]
};

const ginTonic = {
    ingredients: [
        { name: "Gin", quantity: "50 ml" },
        { name: "Acqua tonica", quantity: "150 ml" }
    ]
};

test("menuIngredients mette insieme tutti gli ingredienti dei drink scelti", () => {
    const combined = menuIngredients([negroni, ginTonic]);

    assert.equal(combined.length, 6);
    assert.equal(combined[0].name, "Gin");
});

test("buildMenuShoppingList somma lo stesso ingrediente tra più drink", () => {
    const { missing } = buildMenuShoppingList([negroni, ginTonic], []);

    const gin = missing.find((item) => item.name === "Gin");

    assert.ok(gin);
    assert.equal(gin.quantity, "80 ml");
});

test("buildMenuShoppingList divide tra quello che c'è in dispensa e quello che manca", () => {
    const { have, missing } = buildMenuShoppingList([negroni, ginTonic], ["Gin", "Bitter"]);

    assert.deepEqual(
        have.map((item) => item.name),
        ["Bitter", "Gin"]
    );
    assert.deepEqual(
        missing.map((item) => item.name),
        ["Acqua tonica", "Scorza d'arancia", "Vermouth rosso"]
    );
});

test("con menù vuoto non c'è niente da comprare", () => {
    const { have, missing } = buildMenuShoppingList([], ["Gin"]);

    assert.deepEqual(have, []);
    assert.deepEqual(missing, []);
});

test("combinedPantry aggiunge quello che il bancone ha in scorta, anche se non è in dispensa", () => {
    const owned = combinedPantry(["Gin"], { amounts: { "Rum bianco": 500 }, extras: ["Ghiaccio"] });

    assert.ok(owned.has("Gin"));
    assert.ok(owned.has("Rum bianco"));
    assert.ok(owned.has("Ghiaccio"));
});

test("combinedPantry ignora quello che sul bancone è a zero", () => {
    const owned = combinedPantry(["Gin"], { amounts: { "Rum bianco": 0 } });

    assert.equal(owned.has("Rum bianco"), false);
});

test("un ingrediente aggiunto solo al bancone toglie il drink dalla lista della spesa", () => {
    const ginTonicOnly = [ginTonic];

    const beforeBancone = buildMenuShoppingList(ginTonicOnly, combinedPantry([], {}));
    assert.deepEqual(
        beforeBancone.missing.map((item) => item.name),
        ["Acqua tonica", "Gin"]
    );

    const afterBancone = buildMenuShoppingList(
        ginTonicOnly,
        combinedPantry([], { amounts: { Gin: 700, "Acqua tonica": 1000 } })
    );
    assert.deepEqual(afterBancone.missing, []);
    assert.deepEqual(
        afterBancone.have.map((item) => item.name),
        ["Acqua tonica", "Gin"]
    );
});
