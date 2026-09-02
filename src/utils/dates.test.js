import test from "node:test";
import assert from "node:assert/strict";

import { formatRelativeDate, toDate } from "./dates.js";

const now = new Date("2026-03-15T20:00:00.000Z");

function minutesAgo(minutes) {
    return new Date(now.getTime() - minutes * 60 * 1000);
}

test("toDate accetta Date, Timestamp di firestore, stringhe e secondi", () => {
    const date = new Date("2026-03-15T18:00:00.000Z");

    assert.equal(toDate(date)?.toISOString(), date.toISOString());
    assert.equal(toDate({ toDate: () => date })?.toISOString(), date.toISOString());
    assert.equal(toDate({ seconds: date.getTime() / 1000 })?.toISOString(), date.toISOString());
    assert.equal(toDate("2026-03-15T18:00:00.000Z")?.toISOString(), date.toISOString());
});

test("toDate ritorna null su valori inutilizzabili", () => {
    assert.equal(toDate(null), null);
    assert.equal(toDate(""), null);
    assert.equal(toDate("non una data"), null);
    assert.equal(toDate({}), null);
});

test("formatRelativeDate copre minuti, ore e giorni", () => {
    assert.equal(formatRelativeDate(minutesAgo(0), now), "adesso");
    assert.equal(formatRelativeDate(minutesAgo(1), now), "1 minuto fa");
    assert.equal(formatRelativeDate(minutesAgo(42), now), "42 minuti fa");
    assert.equal(formatRelativeDate(minutesAgo(60), now), "1 ora fa");
    assert.equal(formatRelativeDate(minutesAgo(60 * 5), now), "5 ore fa");
    assert.equal(formatRelativeDate(minutesAgo(60 * 24), now), "ieri");
    assert.equal(formatRelativeDate(minutesAgo(60 * 24 * 4), now), "4 giorni fa");
});

test("formatRelativeDate passa alla data piena dopo un mese", () => {
    const vecchia = formatRelativeDate(minutesAgo(60 * 24 * 60), now);

    assert.ok(vecchia.includes("2026"));
    assert.ok(!vecchia.includes("giorni fa"));
});

test("formatRelativeDate non va in negativo con l'orologio sfasato", () => {
    const futuro = new Date(now.getTime() + 5 * 60 * 1000);

    assert.equal(formatRelativeDate(futuro, now), "adesso");
});

test("formatRelativeDate resta vuota se la data non c'è", () => {
    assert.equal(formatRelativeDate(null, now), "");
});
