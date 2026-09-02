import test from "node:test";
import assert from "node:assert/strict";

import {
    buildPartyShoppingList,
    formatVolume,
    normalizeEstimatedPeople,
    partyShoppingText,
    peopleForShopping,
    toggleBoughtIngredient
} from "./partyShopping.js";

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
        { name: "Acqua tonica", quantity: "150 ml" },
        { name: "Ghiaccio", quantity: "" }
    ]
};

function rowFor(rows, name) {
    return rows.find((row) => row.name === name);
}

test("normalizeEstimatedPeople tiene lo zero come 'non indicato'", () => {
    assert.equal(normalizeEstimatedPeople(0), 0);
    assert.equal(normalizeEstimatedPeople(""), 0);
    assert.equal(normalizeEstimatedPeople(-4), 0);
    assert.equal(normalizeEstimatedPeople("12"), 12);
    assert.equal(normalizeEstimatedPeople(8.6), 9);
    assert.equal(normalizeEstimatedPeople(9999), 200);
});

test("peopleForShopping conta una persona anche quando non è indicata", () => {
    assert.equal(peopleForShopping(0), 1);
    assert.equal(peopleForShopping(15), 15);
});

test("formatVolume passa ai litri solo sopra il litro", () => {
    assert.equal(formatVolume(700), "700 ml");
    assert.equal(formatVolume(2100), "2,1 l");
    assert.equal(formatVolume(2000), "2 l");
});

test("somma le dosi di tutti i drink e le moltiplica per le persone", () => {
    const rows = buildPartyShoppingList({ drinks: [negroni, ginTonic], people: 10 });

    // 30 ml nel negroni + 50 ml nel gin tonic, per dieci persone
    assert.equal(rowFor(rows, "Gin").needed, 800);
    assert.equal(rowFor(rows, "Acqua tonica").needed, 1500);
    assert.equal(rowFor(rows, "Bitter").needed, 300);
});

test("senza persone indicate resta il giro singolo", () => {
    const rows = buildPartyShoppingList({ drinks: [negroni, ginTonic], people: 0 });

    assert.equal(rowFor(rows, "Gin").needed, 80);
});

test("scala quello che c'è già sul bancone", () => {
    const rows = buildPartyShoppingList({
        drinks: [ginTonic],
        people: 4,
        inventory: { amounts: { Gin: 700, "Acqua tonica": 100 }, extras: [] }
    });

    const gin = rowFor(rows, "Gin");

    assert.equal(gin.needed, 200);
    assert.equal(gin.available, 700);
    assert.equal(gin.toBuy, 0);
    assert.ok(gin.enough);

    const tonica = rowFor(rows, "Acqua tonica");

    assert.equal(tonica.needed, 600);
    assert.equal(tonica.toBuy, 500);
    assert.ok(!tonica.enough);
});

// le persone attese sono una decisione di chi organizza: la scorta del
// bancone cambia solo quanto resta da comprare, mai per quante persone
// si sta facendo il conto
test("il numero di persone non si piega a quello che c'è sul bancone", () => {
    const conBancone = buildPartyShoppingList({
        drinks: [negroni, ginTonic],
        people: 30,
        inventory: { amounts: { Gin: 700, Bitter: 200 }, extras: ["Ghiaccio"] }
    });

    const senzaNiente = buildPartyShoppingList({
        drinks: [negroni, ginTonic],
        people: 30,
        inventory: { amounts: {}, extras: [] }
    });

    assert.equal(rowFor(conBancone, "Gin").needed, 2400);
    assert.equal(rowFor(senzaNiente, "Gin").needed, 2400);

    // quello che cambia è solo quanto manca, non il fabbisogno
    assert.equal(rowFor(conBancone, "Gin").toBuy, 1700);
    assert.equal(rowFor(senzaNiente, "Gin").toBuy, 2400);
});

// avere l'ingrediente e averne abbastanza per tutti sono due cose
// diverse: la bottiglia che c'è non deve mai risultare "mancante"
test("una bottiglia che non basta resta comunque una bottiglia che hai", () => {
    const rows = buildPartyShoppingList({
        drinks: [ginTonic],
        people: 30,
        inventory: { amounts: { Gin: 700 }, extras: [] }
    });

    const gin = rowFor(rows, "Gin");

    assert.ok(gin.owned);
    assert.ok(!gin.enough);
    assert.equal(gin.needed, 1500);
    assert.equal(gin.toBuy, 800);

    // l'acqua tonica invece non ce l'ha proprio
    const tonica = rowFor(rows, "Acqua tonica");

    assert.ok(!tonica.owned);
    assert.equal(tonica.toBuy, tonica.needed);
});

// la dispensa segnala "ce l'hai in casa" ma non accende la spunta: se
// lo facesse, togliere la spunta a un ingrediente che sta in dispensa
// non avrebbe effetto e la checklist smetterebbe di rispondere
test("la dispensa si vede nella riga ma non decide la spunta", () => {
    const rows = buildPartyShoppingList({
        drinks: [ginTonic],
        people: 4,
        inventory: { amounts: {}, extras: [] },
        pantry: ["Gin", "Ghiaccio"]
    });

    const gin = rowFor(rows, "Gin");

    assert.ok(gin.onlyInPantry);
    assert.ok(!gin.enough);
    assert.ok(!gin.owned);
    assert.equal(gin.toBuy, gin.needed);

    assert.ok(rowFor(rows, "Ghiaccio").onlyInPantry);
    assert.ok(!rowFor(rows, "Ghiaccio").enough);

    // quello che non è né sul bancone né in dispensa non ha nemmeno la nota
    assert.equal(rowFor(rows, "Acqua tonica").onlyInPantry, false);
});

test("quello che è già sul bancone non risulta 'solo in dispensa'", () => {
    const rows = buildPartyShoppingList({
        drinks: [ginTonic],
        people: 4,
        inventory: { amounts: { Gin: 100 }, extras: ["Ghiaccio"] },
        pantry: ["Gin", "Ghiaccio"]
    });

    const gin = rowFor(rows, "Gin");

    assert.equal(gin.available, 100);
    assert.equal(gin.onlyInPantry, false);
    assert.ok(gin.owned);
    assert.ok(!gin.enough);

    assert.equal(rowFor(rows, "Ghiaccio").onlyInPantry, false);
    assert.ok(rowFor(rows, "Ghiaccio").enough);
});

// il giro completo della casella: spunto, si spegne il "da comprare";
// tolgo la spunta, torna da comprare. Anche con la dispensa piena
test("la spunta si accende e si spegne davvero, dispensa o no", () => {
    const pantry = ["Gin", "Acqua tonica", "Ghiaccio"];
    let inventory = { amounts: {}, extras: [] };

    const before = buildPartyShoppingList({ drinks: [ginTonic], people: 6, inventory, pantry });

    assert.ok(!rowFor(before, "Gin").enough);

    inventory = toggleBoughtIngredient(inventory, rowFor(before, "Gin"), true);

    const after = buildPartyShoppingList({ drinks: [ginTonic], people: 6, inventory, pantry });

    assert.ok(rowFor(after, "Gin").enough);
    assert.equal(rowFor(after, "Gin").available, 300);

    inventory = toggleBoughtIngredient(inventory, rowFor(after, "Gin"), false);

    const again = buildPartyShoppingList({ drinks: [ginTonic], people: 6, inventory, pantry });

    assert.ok(!rowFor(again, "Gin").enough);
    assert.ok(rowFor(again, "Gin").onlyInPantry);
});

test("gli extra non si contano in millilitri, basta averli", () => {
    const rows = buildPartyShoppingList({
        drinks: [negroni, ginTonic],
        people: 30,
        inventory: { amounts: {}, extras: ["Ghiaccio"] }
    });

    const ghiaccio = rowFor(rows, "Ghiaccio");

    assert.equal(ghiaccio.countedByAmount, false);
    assert.equal(ghiaccio.needed, 0);
    assert.ok(ghiaccio.enough);

    assert.ok(!rowFor(rows, "Scorza d'arancia").enough);
});

test("la lista è in ordine alfabetico e senza doppioni", () => {
    const rows = buildPartyShoppingList({ drinks: [negroni, ginTonic], people: 2 });

    assert.deepEqual(
        rows.map((row) => row.name),
        ["Acqua tonica", "Bitter", "Ghiaccio", "Gin", "Scorza d'arancia", "Vermouth rosso"]
    );
});

test("spuntare una riga mette sul bancone la quantità che serve", () => {
    const inventory = { amounts: { Gin: 700 }, extras: [] };
    const rows = buildPartyShoppingList({ drinks: [ginTonic], people: 10, inventory });

    const tonica = rowFor(rows, "Acqua tonica");
    const next = toggleBoughtIngredient(inventory, tonica, true);

    assert.equal(next.amounts["Acqua tonica"], 1500);
    // il gin che c'era già non lo tocca
    assert.equal(next.amounts.Gin, 700);
});

test("spuntare non scende sotto quello che c'era già sul bancone", () => {
    const inventory = { amounts: { Gin: 5000 }, extras: [] };
    const rows = buildPartyShoppingList({ drinks: [ginTonic], people: 2, inventory });

    const next = toggleBoughtIngredient(inventory, rowFor(rows, "Gin"), true);

    assert.equal(next.amounts.Gin, 5000);
});

test("togliere la spunta rimette l'ingrediente tra i mancanti", () => {
    const inventory = { amounts: { Gin: 700 }, extras: ["Ghiaccio"] };
    const rows = buildPartyShoppingList({ drinks: [ginTonic], people: 1, inventory });

    const senzaGin = toggleBoughtIngredient(inventory, rowFor(rows, "Gin"), false);

    assert.equal("Gin" in senzaGin.amounts, false);

    const senzaGhiaccio = toggleBoughtIngredient(inventory, rowFor(rows, "Ghiaccio"), false);

    assert.deepEqual(senzaGhiaccio.extras, []);
});

test("gli extra si spuntano senza millilitri", () => {
    const inventory = { amounts: {}, extras: [] };
    const rows = buildPartyShoppingList({ drinks: [ginTonic], people: 8, inventory });

    const next = toggleBoughtIngredient(inventory, rowFor(rows, "Ghiaccio"), true);

    assert.deepEqual(next.extras, ["Ghiaccio"]);
    assert.equal("Ghiaccio" in next.amounts, false);
});

test("spuntare non tocca i drink tolti dal menù", () => {
    const inventory = { amounts: {}, extras: [], removedDrinks: ["abc"] };
    const rows = buildPartyShoppingList({ drinks: [ginTonic], people: 1, inventory });

    const next = toggleBoughtIngredient(inventory, rowFor(rows, "Gin"), true);

    assert.deepEqual(next.removedDrinks, ["abc"]);
});

test("il testo da copiare tiene solo quello che manca davvero", () => {
    const rows = buildPartyShoppingList({
        drinks: [ginTonic],
        people: 4,
        inventory: { amounts: { Gin: 700 }, extras: [] }
    });

    assert.equal(partyShoppingText(rows), "Acqua tonica — 600 ml\nGhiaccio — q.b.");
});
