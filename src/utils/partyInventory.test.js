import test from "node:test";
import assert from "node:assert/strict";

import {
    DEFAULT_BOTTLE_ML,
    DEFAULT_MIXER_ML,
    addPantryToPartyInventory,
    availableIngredients,
    buildPartyInventory,
    canPrepare,
    consumeDrink,
    emptyPartyInventory,
    isRemovedFromBar,
    mergePartyInventory,
    missingForDrink,
    normalizePartyInventory
} from "./partyInventory.js";

const ginTonic = [
    { name: "Gin", quantity: "50 ml" },
    { name: "Acqua tonica", quantity: "150 ml" },
    { name: "Ghiaccio", quantity: "q.b." }
];

function inventarioPieno() {
    return {
        amounts: { Gin: 700, "Acqua tonica": 1000 },
        extras: ["Ghiaccio"]
    };
}

test("normalizePartyInventory ripulisce quantità sporche e toglie gli zeri", () => {
    assert.deepEqual(
        normalizePartyInventory({
            amounts: { Gin: "700", Vodka: -5, Campari: 0, Rum: "tanto" },
            extras: ["Ghiaccio", "Ghiaccio", "", 3],
            removedDrinks: ["abc", "abc", ""]
        }),
        { amounts: { Gin: 700 }, extras: ["Ghiaccio"], removedDrinks: ["abc"] }
    );

    assert.deepEqual(normalizePartyInventory(null), emptyPartyInventory());
});

test("availableIngredients esclude quello che è finito", () => {
    const disponibili = availableIngredients({
        amounts: { Gin: 700 },
        extras: ["Ghiaccio"]
    });

    assert.equal(disponibili.has("Gin"), true);
    assert.equal(disponibili.has("Ghiaccio"), true);
    assert.equal(disponibili.has("Campari"), false);
});

test("canPrepare guarda anche le quantità, non solo la presenza", () => {
    assert.equal(canPrepare(inventarioPieno(), ginTonic), true);

    const quasiFinito = { amounts: { Gin: 30, "Acqua tonica": 1000 }, extras: ["Ghiaccio"] };

    assert.equal(canPrepare(quasiFinito, ginTonic), false);
    assert.equal(canPrepare(inventarioPieno(), []), false);
});

test("missingForDrink distingue assente da insufficiente", () => {
    const mancante = missingForDrink(
        { amounts: { Gin: 30 }, extras: [] },
        ginTonic
    );

    assert.deepEqual(mancante, [
        { name: "Gin", needed: 50, available: 30, reason: "insufficiente" },
        { name: "Acqua tonica", needed: 150, available: 0, reason: "assente" },
        { name: "Ghiaccio", needed: 0, available: 0, reason: "assente" }
    ]);
});

test("consumeDrink scala solo alcolici e analcolici", () => {
    const risultato = consumeDrink(inventarioPieno(), ginTonic);

    assert.equal(risultato.ok, true);
    assert.deepEqual(risultato.inventory, {
        amounts: { Gin: 650, "Acqua tonica": 850 },
        extras: ["Ghiaccio"],
        removedDrinks: []
    });
});

test("consumeDrink somma le righe doppie dello stesso ingrediente", () => {
    const doppioGin = [
        { name: "Gin", quantity: "30 ml" },
        { name: "Gin", quantity: "20 ml" }
    ];

    const risultato = consumeDrink({ amounts: { Gin: 100 }, extras: [] }, doppioGin);

    assert.equal(risultato.ok, true);
    assert.equal(risultato.inventory.amounts.Gin, 50);
});

test("consumeDrink non tocca niente se l'inventario non basta", () => {
    const partenza = { amounts: { Gin: 30, "Acqua tonica": 1000 }, extras: ["Ghiaccio"] };
    const risultato = consumeDrink(partenza, ginTonic);

    assert.equal(risultato.ok, false);
    assert.deepEqual(risultato.inventory, { ...partenza, removedDrinks: [] });
    assert.equal(risultato.missing[0].name, "Gin");
});

test("consumeDrink svuota fino a zero senza andare in negativo, e toglie l'ingrediente finito", () => {
    const risultato = consumeDrink(
        { amounts: { Gin: 50, "Acqua tonica": 150 }, extras: ["Ghiaccio"] },
        ginTonic
    );

    assert.equal(risultato.ok, true);
    assert.equal("Gin" in risultato.inventory.amounts, false);
    assert.equal(canPrepare(risultato.inventory, ginTonic), false);
});

test("un ingrediente senza quantità basta che ci sia", () => {
    const senzaDose = [{ name: "Gin", quantity: "" }];

    assert.equal(canPrepare({ amounts: { Gin: 10 }, extras: [] }, senzaDose), true);
    assert.equal(canPrepare({ amounts: { Gin: 0 }, extras: [] }, senzaDose), false);
});

test("buildPartyInventory parte dalla dispensa personale con dosi di default", () => {
    const inventario = buildPartyInventory(["Gin", "Acqua tonica", "Ghiaccio"]);

    assert.deepEqual(inventario, {
        amounts: { Gin: DEFAULT_BOTTLE_ML, "Acqua tonica": DEFAULT_MIXER_ML },
        extras: ["Ghiaccio"]
    });
});

test("mergePartyInventory non riscrive i ml scalati mentre modificavo", () => {
    const base = { amounts: { Gin: 700, Rum: 500 }, extras: ["Ghiaccio"] };

    // ho toccato solo il gin
    const mio = { amounts: { Gin: 900, Rum: 500 }, extras: ["Ghiaccio"] };

    // nel frattempo il rum è stato versato due volte
    const server = { amounts: { Gin: 700, Rum: 400 }, extras: ["Ghiaccio"] };

    assert.deepEqual(mergePartyInventory(base, mio, server), {
        amounts: { Gin: 900, Rum: 400 },
        extras: ["Ghiaccio"],
        removedDrinks: []
    });
});

test("mergePartyInventory applica aggiunte e rimozioni mie, e tiene quelle degli altri", () => {
    const base = { amounts: { Gin: 700, Rum: 500 }, extras: ["Ghiaccio"] };
    const mio = { amounts: { Gin: 700, Campari: 700 }, extras: ["Ghiaccio", "Menta fresca"] };
    const server = { amounts: { Gin: 650, Rum: 500, Vodka: 700 }, extras: ["Ghiaccio", "Oliva"] };

    const merged = mergePartyInventory(base, mio, server);

    // il rum l'ho tolto io, la vodka l'ha messa un altro bar
    assert.deepEqual(merged.amounts, { Gin: 650, Vodka: 700, Campari: 700 });
    assert.deepEqual(merged.extras.sort(), ["Ghiaccio", "Menta fresca", "Oliva"]);
});

test("mergePartyInventory toglie gli extra che ho tolto io", () => {
    const base = { amounts: {}, extras: ["Ghiaccio", "Oliva"] };
    const mio = { amounts: {}, extras: ["Ghiaccio"] };
    const server = { amounts: {}, extras: ["Ghiaccio", "Oliva"] };

    assert.deepEqual(mergePartyInventory(base, mio, server).extras, ["Ghiaccio"]);
});

test("mergePartyInventory senza modifiche lascia il server intatto", () => {
    const stessa = { amounts: { Gin: 700 }, extras: ["Ghiaccio"] };
    const server = { amounts: { Gin: 120 }, extras: ["Ghiaccio", "Oliva"] };

    assert.deepEqual(mergePartyInventory(stessa, stessa, server), {
        amounts: { Gin: 120 },
        extras: ["Ghiaccio", "Oliva"],
        removedDrinks: []
    });
});

test("isRemovedFromBar riconosce un drink tolto anche se ci sono gli ingredienti", () => {
    const inventario = { amounts: { Gin: 700 }, extras: [], removedDrinks: ["negroni"] };

    assert.equal(isRemovedFromBar(inventario, "negroni"), true);
    assert.equal(isRemovedFromBar(inventario, "gin-tonic"), false);
});

test("mergePartyInventory prende sempre i drink tolti dal server, l'editor del bancone non li tocca", () => {
    const base = { amounts: { Gin: 700 }, extras: [], removedDrinks: ["negroni"] };
    const mio = { amounts: { Gin: 900 }, extras: [], removedDrinks: ["negroni"] };
    const server = { amounts: { Gin: 700 }, extras: [], removedDrinks: ["negroni", "spritz"] };

    assert.deepEqual(mergePartyInventory(base, mio, server).removedDrinks, ["negroni", "spritz"]);
});

test("addPantryToPartyInventory aggiunge solo quello che manca, senza toccare il resto", () => {
    const bancone = {
        amounts: { Gin: 120, Vodka: 700 },
        extras: ["Oliva"],
        removedDrinks: ["negroni"]
    };

    const risultato = addPantryToPartyInventory(["Gin", "Campari", "Ghiaccio"], bancone);

    // il Gin già sul bancone tiene i suoi 120 ml, il Campari nuovo parte
    // dal default, e la Vodka (non più in dispensa) resta comunque lì
    assert.deepEqual(risultato, {
        amounts: { Gin: 120, Vodka: 700, Campari: DEFAULT_BOTTLE_ML },
        extras: ["Oliva", "Ghiaccio"]
    });
});

test("addPantryToPartyInventory su un bancone vuoto si comporta come buildPartyInventory", () => {
    assert.deepEqual(
        addPantryToPartyInventory(["Gin", "Ghiaccio"], null),
        buildPartyInventory(["Gin", "Ghiaccio"])
    );
});

test("buildPartyInventory tiene le quantità già corrette a mano", () => {
    const inventario = buildPartyInventory(["Gin", "Campari"], {
        amounts: { Gin: 120 },
        extras: []
    });

    assert.deepEqual(inventario.amounts, { Gin: 120, Campari: DEFAULT_BOTTLE_ML });
});
