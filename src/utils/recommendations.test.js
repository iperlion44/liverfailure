import test from "node:test";
import assert from "node:assert/strict";

import {
    buildTasteProfile,
    ingredientWeight,
    recommendDrinks,
    sharedIngredients,
    similarityScore
} from "./recommendations.js";

const negroni = {
    id: "negroni",
    name: "Negroni",
    authorId: "altro",
    ingredients: [
        { name: "Gin", quantity: "30 ml" },
        { name: "Campari", quantity: "30 ml" },
        { name: "Vermouth rosso", quantity: "30 ml" }
    ]
};

const ginTonic = {
    id: "gin-tonic",
    name: "Gin tonic",
    authorId: "altro",
    ingredients: [
        { name: "Gin", quantity: "50 ml" },
        { name: "Acqua tonica", quantity: "150 ml" },
        { name: "Spicchio di lime", quantity: "1" }
    ]
};

const espressoMartini = {
    id: "espresso-martini",
    name: "Espresso martini",
    authorId: "altro",
    ingredients: [
        { name: "Vodka", quantity: "50 ml" },
        { name: "Liquore al caffè", quantity: "20 ml" },
        { name: "Caffè", quantity: "30 ml" }
    ]
};

test("ingredientWeight pesa di più gli alcolici", () => {
    assert.equal(ingredientWeight("Gin"), 3);
    assert.equal(ingredientWeight("Acqua tonica"), 2);
});

test("buildTasteProfile somma i pesi degli ingredienti dei preferiti e ignora gli extra", () => {
    const profile = buildTasteProfile([negroni, ginTonic]);

    assert.equal(profile.get("Gin"), 6);
    assert.equal(profile.get("Campari"), 3);
    assert.equal(profile.has("Spicchio di lime"), false);
    assert.equal(profile.has("Vodka"), false);
});

test("similarityScore è zero senza ingredienti in comune", () => {
    const profile = buildTasteProfile([negroni]);

    assert.equal(similarityScore(espressoMartini, profile), 0);
    assert.equal(similarityScore(negroni, new Map()), 0);
});

test("similarityScore premia chi condivide più ingredienti pesanti", () => {
    const profile = buildTasteProfile([negroni]);

    const gemello = {
        id: "gemello",
        ingredients: [
            { name: "Gin", quantity: "30 ml" },
            { name: "Campari", quantity: "30 ml" }
        ]
    };

    const soloGin = { id: "solo-gin", ingredients: [{ name: "Gin", quantity: "50 ml" }] };

    assert.ok(similarityScore(gemello, profile) > similarityScore(soloGin, profile));
});

test("sharedIngredients elenca solo quello che è già nei preferiti", () => {
    const profile = buildTasteProfile([negroni]);

    assert.deepEqual(sharedIngredients(ginTonic, profile), ["Gin"]);
});

test("un drink simile solo per un extra non conta come simile", () => {
    const profile = buildTasteProfile([negroni]);

    const soloGhiaccio = {
        id: "solo-ghiaccio",
        ingredients: [
            { name: "Vodka", quantity: "50 ml" },
            { name: "Ghiaccio", quantity: "1" }
        ]
    };

    assert.deepEqual(sharedIngredients(soloGhiaccio, profile), []);
    assert.equal(similarityScore(soloGhiaccio, profile), 0);
});

test("recommendDrinks esclude preferiti, drink miei e roba senza attinenza", () => {
    const mioDrink = { ...ginTonic, id: "mio", authorId: "io" };

    const risultati = recommendDrinks({
        drinks: [negroni, ginTonic, espressoMartini, mioDrink],
        favorites: [negroni],
        userId: "io"
    });

    const ids = risultati.map((entry) => entry.drink.id);

    assert.deepEqual(ids, ["gin-tonic"]);
});

test("recommendDrinks non consiglia niente senza preferiti", () => {
    assert.deepEqual(
        recommendDrinks({ drinks: [negroni, ginTonic], favorites: [] }),
        []
    );
});

test("recommendDrinks usa la media voti solo come spinta secondaria", () => {
    const primo = {
        id: "primo",
        name: "Primo",
        ingredients: [{ name: "Gin", quantity: "50 ml" }, { name: "Campari", quantity: "20 ml" }]
    };

    const secondo = {
        id: "secondo",
        name: "Secondo",
        ingredients: [{ name: "Gin", quantity: "50 ml" }, { name: "Campari", quantity: "20 ml" }]
    };

    // stessa somiglianza: decide la media voti
    const conVoti = recommendDrinks({
        drinks: [primo, secondo],
        favorites: [negroni],
        ratings: { secondo: { ratingTotal: 60, ratingCount: 12 } }
    });

    assert.deepEqual(conVoti.map((entry) => entry.drink.id), ["secondo", "primo"]);

    // un solo voto pieno non deve bastare a scavalcare chi somiglia di più
    const piuSimile = {
        id: "piu-simile",
        name: "Più simile",
        ingredients: [
            { name: "Gin", quantity: "30 ml" },
            { name: "Campari", quantity: "30 ml" },
            { name: "Vermouth rosso", quantity: "30 ml" }
        ]
    };

    const menoSimile = {
        id: "meno-simile",
        name: "Meno simile",
        ingredients: [{ name: "Gin", quantity: "50 ml" }, { name: "Caffè", quantity: "30 ml" }]
    };

    const classifica = recommendDrinks({
        drinks: [menoSimile, piuSimile],
        favorites: [negroni],
        ratings: { "meno-simile": { ratingTotal: 5, ratingCount: 1 } }
    });

    assert.equal(classifica[0].drink.id, "piu-simile");
});

test("recommendDrinks taglia la lista al limite chiesto", () => {
    const drinks = Array.from({ length: 12 }, (_, index) => ({
        id: `drink-${index}`,
        name: `Drink ${index}`,
        ingredients: [{ name: "Gin", quantity: "50 ml" }]
    }));

    assert.equal(recommendDrinks({ drinks, favorites: [negroni], limit: 6 }).length, 6);
});
