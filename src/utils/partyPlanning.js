import { normalizeIngredients } from "./drink.js";
import { toInventorySet } from "./inventoryMatch.js";
import { availableIngredients } from "./partyInventory.js";
import { buildShoppingList } from "./quantityScale.js";

// qui basta sapere se l'ingrediente c'è o no, come nel resto dell'app:
// niente confronto sui millilitri, quello lo fa già il bancone quando
// la festa è avviata
export function menuIngredients(drinks = []) {
    return drinks.flatMap((drink) => normalizeIngredients(drink.ingredients));
}

// quello che conta come "ce l'hai già" è la propria dispensa PIÙ quello
// che il bancone della festa ha già in scorta: se aggiungi una bottiglia
// al bancone che a casa non avevi segnato, deve sparire dalla lista
// della spesa senza dover anche aggiornare la dispensa personale
export function combinedPantry(pantry, partyInventory) {
    const combined = new Set(toInventorySet(pantry));

    availableIngredients(partyInventory).forEach((name) => combined.add(name));

    return combined;
}

// sommo le quantità dei drink scelti (buildShoppingList unisce già le
// righe con lo stesso nome) e poi divido tra quello che c'è in dispensa
// e quello che manca ancora
export function buildMenuShoppingList(drinks, inventory) {
    const owned = toInventorySet(inventory);
    const combined = buildShoppingList(menuIngredients(drinks));

    const have = [];
    const missing = [];

    combined.forEach((ingredient) => {
        (owned.has(ingredient.name) ? have : missing).push(ingredient);
    });

    const byName = (first, second) => first.name.localeCompare(second.name, "it");

    return { have: have.sort(byName), missing: missing.sort(byName) };
}
