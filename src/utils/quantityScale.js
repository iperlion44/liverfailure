import { normalizeIngredients } from "./drink.js";

// le quantità sono stringhe scritte a mano ("50 ml", "2 spicchi",
// "q.b."): non provo a capire l'unità di misura, prendo il numero
// davanti, lo moltiplico e riattacco il resto com'era
const LEADING_NUMBER = /^(\d+(?:[.,]\d+)?)\s*(.*)$/;

export const MIN_PEOPLE = 1;
export const MAX_PEOPLE = 20;

function formatAmount(value) {
    if (Number.isInteger(value)) {
        return String(value);
    }

    // una cifra dopo la virgola basta: "12,5 ml" si capisce, "12,47" no
    return value.toFixed(1).replace(".", ",");
}

export function scaleQuantity(quantity, people) {
    const text = String(quantity ?? "").trim();
    const times = Number(people);

    if (!text || !Number.isFinite(times) || times <= 1) {
        return text;
    }

    const match = text.match(LEADING_NUMBER);

    if (!match) {
        return text;
    }

    const [, rawAmount, rest] = match;
    const scaled = Number(rawAmount.replace(",", ".")) * times;

    if (!Number.isFinite(scaled)) {
        return text;
    }

    return rest ? `${formatAmount(scaled)} ${rest}` : formatAmount(scaled);
}

export function scaleIngredients(rawIngredients, people) {
    return normalizeIngredients(rawIngredients).map((ingredient) => ({
        ...ingredient,
        quantity: scaleQuantity(ingredient.quantity, people)
    }));
}

// la lista della spesa: gli ingredienti che mi mancano, sommati se
// compaiono due volte nella stessa ricetta e scalati per quante
// persone devo servire
export function buildShoppingList(rawIngredients, people = 1) {
    const merged = new Map();

    normalizeIngredients(rawIngredients).forEach((ingredient) => {
        const existing = merged.get(ingredient.name);

        if (!existing) {
            merged.set(ingredient.name, { ...ingredient });
            return;
        }

        // due righe dello stesso ingrediente: sommo solo se sono
        // entrambe numeriche, sennò tengo la prima e non invento nulla
        const existingAmount = existing.quantity.match(LEADING_NUMBER);
        const currentAmount = ingredient.quantity.match(LEADING_NUMBER);

        if (!existingAmount || !currentAmount || existingAmount[2] !== currentAmount[2]) {
            return;
        }

        const total =
            Number(existingAmount[1].replace(",", ".")) +
            Number(currentAmount[1].replace(",", "."));

        existing.quantity = existingAmount[2]
            ? `${formatAmount(total)} ${existingAmount[2]}`
            : formatAmount(total);
    });

    return [...merged.values()].map((ingredient) => ({
        name: ingredient.name,
        quantity: scaleQuantity(ingredient.quantity, people)
    }));
}

export function shoppingListText(list = []) {
    return list
        .map((item) => (item.quantity ? `${item.name} — ${item.quantity}` : item.name))
        .join("\n");
}

export function peopleLabel(people) {
    return Number(people) === 1 ? "1 persona" : `${people} persone`;
}
