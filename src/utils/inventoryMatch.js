import { normalizeIngredients } from "./drink.js";

// oltre due ingredienti mancanti non è più "ci sono quasi", è una lista
// della spesa: in quel caso non evidenzio niente
export const ALMOST_THRESHOLD = 2;

export const MATCH_READY = "ready";
export const MATCH_ALMOST = "almost";
export const MATCH_FAR = "far";

export function toInventorySet(inventory) {
    if (inventory instanceof Set) {
        return inventory;
    }

    return new Set(
        (Array.isArray(inventory) ? inventory : []).filter(
            (name) => typeof name === "string" && name.length > 0
        )
    );
}

export function missingIngredients(rawIngredients, inventory) {
    const owned = toInventorySet(inventory);
    const seen = new Set();

    return normalizeIngredients(rawIngredients).filter(({ name }) => {
        if (!name || seen.has(name) || owned.has(name)) {
            return false;
        }

        seen.add(name);

        return true;
    });
}

export function matchDrink(rawIngredients, inventory) {
    const owned = toInventorySet(inventory);
    const ingredients = normalizeIngredients(rawIngredients);
    const missing = missingIngredients(ingredients, owned);

    // con la dispensa vuota tutto risulterebbe "ti mancano N cose" e
    // le card si riempirebbero di badge inutili
    if (owned.size === 0 || ingredients.length === 0) {
        return { status: MATCH_FAR, missing, missingCount: missing.length };
    }

    if (missing.length === 0) {
        return { status: MATCH_READY, missing, missingCount: 0 };
    }

    return {
        status: missing.length <= ALMOST_THRESHOLD ? MATCH_ALMOST : MATCH_FAR,
        missing,
        missingCount: missing.length
    };
}

export function matchLabel(match) {
    if (!match || match.status === MATCH_FAR) {
        return "";
    }

    if (match.status === MATCH_READY) {
        return "Puoi farlo ora";
    }

    return match.missingCount === 1 ? "1 mancante" : `${match.missingCount} mancanti`;
}

export function isMakeable(match) {
    return Boolean(match) && (match.status === MATCH_READY || match.status === MATCH_ALMOST);
}

// la checklist della pagina dettaglio: ogni ingrediente con il suo
// "ce l'ho / mi manca"
export function buildChecklist(rawIngredients, inventory) {
    const owned = toInventorySet(inventory);

    return normalizeIngredients(rawIngredients).map((ingredient) => ({
        ...ingredient,
        owned: owned.has(ingredient.name)
    }));
}
