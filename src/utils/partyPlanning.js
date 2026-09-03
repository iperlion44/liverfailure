import { normalizeIngredients } from "./drink.js";
import { toInventorySet } from "./inventoryMatch.js";
import { availableIngredients } from "./partyInventory.js";
import { buildShoppingList } from "./quantityScale.js";

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
