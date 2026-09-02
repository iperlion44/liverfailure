import test from "node:test";
import assert from "node:assert/strict";

import {
    applyReview,
    averageOf,
    bayesianRating,
    emptyRating,
    formatRating,
    isValidRatingValue,
    reviewCountLabel
} from "./rating.js";

test("applyReview aggiunge il primo voto", () => {
    assert.deepEqual(applyReview(emptyRating(), { nextRating: 4 }), {
        ratingTotal: 4,
        ratingCount: 1
    });
});

test("applyReview somma più voti", () => {
    const afterFirst = applyReview(emptyRating(), { nextRating: 5 });
    const afterSecond = applyReview(afterFirst, { nextRating: 4 });

    assert.deepEqual(afterSecond, { ratingTotal: 9, ratingCount: 2 });
    assert.equal(averageOf(afterSecond), 4.5);
});

test("applyReview sostituisce un voto senza cambiare il conteggio", () => {
    const aggregate = { ratingTotal: 9, ratingCount: 2 };

    assert.deepEqual(applyReview(aggregate, { previousRating: 5, nextRating: 1 }), {
        ratingTotal: 5,
        ratingCount: 2
    });
});

test("applyReview toglie un voto e azzera quando resta vuoto", () => {
    assert.deepEqual(applyReview({ ratingTotal: 9, ratingCount: 2 }, { previousRating: 5 }), {
        ratingTotal: 4,
        ratingCount: 1
    });

    assert.deepEqual(applyReview({ ratingTotal: 4, ratingCount: 1 }, { previousRating: 4 }), {
        ratingTotal: 0,
        ratingCount: 0
    });
});

// le regole firestore accettano solo delta di -1, 0 o +1 sul conteggio:
// se questi non tornassero, la scrittura verrebbe rifiutata
test("applyReview muove il conteggio di uno alla volta, come pretendono le regole", () => {
    const partenza = { ratingTotal: 12, ratingCount: 3 };

    assert.equal(applyReview(partenza, { nextRating: 5 }).ratingCount - partenza.ratingCount, 1);
    assert.equal(
        applyReview(partenza, { previousRating: 4, nextRating: 2 }).ratingCount - partenza.ratingCount,
        0
    );
    assert.equal(applyReview(partenza, { previousRating: 4 }).ratingCount - partenza.ratingCount, -1);
});

test("applyReview sposta il totale esattamente del voto toccato", () => {
    const partenza = { ratingTotal: 12, ratingCount: 3 };

    assert.equal(applyReview(partenza, { nextRating: 5 }).ratingTotal, 17);
    assert.equal(applyReview(partenza, { previousRating: 4, nextRating: 2 }).ratingTotal, 10);
    assert.equal(applyReview(partenza, { previousRating: 4 }).ratingTotal, 8);
});

test("applyReview ignora aggregati sporchi invece di propagarli", () => {
    assert.deepEqual(applyReview({ ratingTotal: 99, ratingCount: -3 }, { nextRating: 3 }), {
        ratingTotal: 3,
        ratingCount: 1
    });

    assert.deepEqual(applyReview(null, { nextRating: 2 }), { ratingTotal: 2, ratingCount: 1 });
});

test("applyReview scarta i voti fuori dalla scala 1-5", () => {
    assert.deepEqual(applyReview(emptyRating(), { nextRating: 0 }), emptyRating());
    assert.deepEqual(applyReview(emptyRating(), { nextRating: 6 }), emptyRating());
    assert.deepEqual(applyReview(emptyRating(), { nextRating: 3.5 }), emptyRating());
});

test("isValidRatingValue accetta solo interi da 1 a 5", () => {
    assert.equal(isValidRatingValue(1), true);
    assert.equal(isValidRatingValue(5), true);
    assert.equal(isValidRatingValue(0), false);
    assert.equal(isValidRatingValue("4"), false);
});

test("averageOf divide il totale per il conteggio", () => {
    assert.equal(averageOf({ ratingTotal: 13, ratingCount: 3 }), 13 / 3);
    assert.equal(averageOf(emptyRating()), 0);
    assert.equal(averageOf(null), 0);
});

test("bayesianRating non lascia dominare un singolo voto pieno", () => {
    const unoSolo = bayesianRating({ ratingTotal: 5, ratingCount: 1 });
    const tantiOttimi = bayesianRating({ ratingTotal: 92, ratingCount: 20 });

    assert.ok(tantiOttimi > unoSolo);
    assert.equal(bayesianRating(emptyRating()), 3.5);
});

test("formatRating usa la virgola e il trattino quando non c'è niente", () => {
    assert.equal(formatRating(4.25), "4,3");
    assert.equal(formatRating(5), "5,0");
    assert.equal(formatRating(0), "—");
});

test("reviewCountLabel accorda singolare e plurale", () => {
    assert.equal(reviewCountLabel(0), "Nessuna recensione");
    assert.equal(reviewCountLabel(1), "1 recensione");
    assert.equal(reviewCountLabel(7), "7 recensioni");
});
