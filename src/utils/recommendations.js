import { normalizeIngredients } from "./drink.js";
import { isAlcoholic, isExtra } from "./spirits.js";
import { RATING_MAX, RATING_MIN, bayesianRating } from "./rating.js";

// due drink si somigliano soprattutto per la base alcolica: avere in
// comune il gin conta molto più di avere in comune il ghiaccio
export const ALCOHOLIC_WEIGHT = 3;
export const NON_ALCOHOLIC_WEIGHT = 2;
export const EXTRA_WEIGHT = 1;

export function ingredientWeight(name) {
    if (isAlcoholic(name)) {
        return ALCOHOLIC_WEIGHT;
    }

    if (isExtra(name)) {
        return EXTRA_WEIGHT;
    }

    return NON_ALCOHOLIC_WEIGHT;
}

// senza questo termine un drink con un solo ingrediente che ho nei
// preferiti farebbe 100% di somiglianza e starebbe davanti a uno che
// ne ha quattro azzeccati su cinque
export const SMOOTHING = 3;

// quanto pesa la media voti rispetto alla somiglianza: è un contorno,
// non deve ribaltare la classifica
export const RATING_INFLUENCE = 0.15;

export const RECOMMENDATION_LIMIT = 8;

function uniqueIngredientNames(rawIngredients) {
    const names = [];
    const seen = new Set();

    normalizeIngredients(rawIngredients).forEach(({ name }) => {
        if (!name || seen.has(name)) {
            return;
        }

        seen.add(name);
        names.push(name);
    });

    return names;
}

// il "profilo di gusto": quanto pesa ogni ingrediente nei preferiti,
// contando quante volte compare
export function buildTasteProfile(favorites = []) {
    const profile = new Map();

    favorites.forEach((drink) => {
        uniqueIngredientNames(drink?.ingredients).forEach((name) => {
            profile.set(name, (profile.get(name) ?? 0) + ingredientWeight(name));
        });
    });

    return profile;
}

export function sharedIngredients(drink, profile) {
    return uniqueIngredientNames(drink?.ingredients).filter((name) => profile.has(name));
}

export function similarityScore(drink, profile) {
    if (!profile || profile.size === 0) {
        return 0;
    }

    let matched = 0;
    let total = 0;

    uniqueIngredientNames(drink?.ingredients).forEach((name) => {
        const weight = ingredientWeight(name);

        total += weight;

        if (profile.has(name)) {
            matched += weight;
        }
    });

    if (matched === 0) {
        return 0;
    }

    return matched / (total + SMOOTHING);
}

export function scoreDrink(drink, profile, rating) {
    const similarity = similarityScore(drink, profile);

    if (similarity === 0) {
        return 0;
    }

    // porto la media bayesiana in scala 0-1 così i due pezzi del
    // punteggio sono confrontabili
    const ratingFactor =
        (bayesianRating(rating) - RATING_MIN) / (RATING_MAX - RATING_MIN);

    return similarity * (1 - RATING_INFLUENCE) + ratingFactor * RATING_INFLUENCE;
}

export function recommendDrinks({
    drinks = [],
    favorites = [],
    ratings = {},
    userId = null,
    limit = RECOMMENDATION_LIMIT
} = {}) {
    const profile = buildTasteProfile(favorites);

    if (profile.size === 0) {
        return [];
    }

    const favoriteIds = new Set(
        favorites.map((favorite) => favorite?.id).filter(Boolean)
    );

    return drinks
        .filter(
            (drink) =>
                drink &&
                drink.id &&
                !favoriteIds.has(drink.id) &&
                (!userId || drink.authorId !== userId)
        )
        .map((drink) => ({
            drink,
            score: scoreDrink(drink, profile, ratings[drink.id]),
            shared: sharedIngredients(drink, profile)
        }))
        .filter((entry) => entry.score > 0)
        // a parità di punteggio ordino per nome, altrimenti la lista
        // cambia ordine da sola tra un caricamento e l'altro
        .sort(
            (first, second) =>
                second.score - first.score ||
                String(first.drink.name ?? "").localeCompare(String(second.drink.name ?? ""), "it")
        )
        .slice(0, limit);
}
