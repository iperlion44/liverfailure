import { DESCRIPTION_MAX_LENGTH } from "./drink.js";

export const RATING_MIN = 1;
export const RATING_MAX = 5;

// stessa lunghezza della descrizione di un drink: se 300 caratteri
// bastano per raccontare la ricetta, bastano anche per commentarla
export const REVIEW_MAX_LENGTH = DESCRIPTION_MAX_LENGTH;

// l'aggregato tiene la SOMMA dei voti, non la media. sembra un dettaglio
// ma è quello che rende l'aggregato verificabile: con la somma le regole
// firestore possono controllare l'equazione esatta ("il totale è
// cresciuto esattamente del voto che hai appena messo"), con una media
// no, e chiunque potrebbe scriverci dentro il numero che preferisce
export function emptyRating() {
    return { ratingTotal: 0, ratingCount: 0 };
}

function toNonNegativeInt(value) {
    const number = Number(value);

    return Number.isFinite(number) ? Math.max(0, Math.trunc(number)) : 0;
}

function sanitize(aggregate) {
    const ratingCount = toNonNegativeInt(aggregate?.ratingCount);

    if (ratingCount === 0) {
        return emptyRating();
    }

    return { ratingCount, ratingTotal: toNonNegativeInt(aggregate?.ratingTotal) };
}

export function isValidRatingValue(value) {
    return Number.isInteger(value) && value >= RATING_MIN && value <= RATING_MAX;
}

export function averageOf(aggregate) {
    const { ratingTotal, ratingCount } = sanitize(aggregate);

    return ratingCount > 0 ? ratingTotal / ratingCount : 0;
}

// il risultato deve corrispondere esattamente a quello che le regole si
// aspettano: +1 voto quando la recensione nasce, stesso conteggio quando
// la cambio, -1 quando la tolgo. niente arrotondamenti in mezzo
export function applyReview(aggregate, { previousRating = null, nextRating = null } = {}) {
    const current = sanitize(aggregate);

    let ratingTotal = current.ratingTotal;
    let ratingCount = current.ratingCount;

    if (isValidRatingValue(previousRating)) {
        ratingTotal -= previousRating;
        ratingCount -= 1;
    }

    if (isValidRatingValue(nextRating)) {
        ratingTotal += nextRating;
        ratingCount += 1;
    }

    // togliendo l'ultima recensione conteggio e totale arrivano a zero
    // insieme; se ci arrivasse solo uno dei due vuol dire che l'aggregato
    // era già fuori sincrono, e allora meglio azzerare che scrivere
    // numeri impossibili
    if (ratingCount <= 0 || ratingTotal <= 0) {
        return emptyRating();
    }

    return { ratingTotal, ratingCount };
}

// media bayesiana: un drink con un solo 5 non deve scavalcare quello
// con venti voti a 4,6. finché i voti sono pochi il punteggio resta
// attaccato alla media di partenza
export const RATING_PRIOR = 3.5;
export const RATING_PRIOR_WEIGHT = 5;

export function bayesianRating(aggregate, { prior = RATING_PRIOR, weight = RATING_PRIOR_WEIGHT } = {}) {
    const { ratingTotal, ratingCount } = sanitize(aggregate);

    return (prior * weight + ratingTotal) / (weight + ratingCount);
}

export function formatRating(value) {
    const number = Number(value);

    if (!Number.isFinite(number) || number <= 0) {
        return "—";
    }

    return number.toFixed(1).replace(".", ",");
}

export function reviewCountLabel(count) {
    const number = Number(count);

    if (!Number.isFinite(number) || number <= 0) {
        return "Nessuna recensione";
    }

    return number === 1 ? "1 recensione" : `${number} recensioni`;
}
