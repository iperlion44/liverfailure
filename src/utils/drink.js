// oltre questa lunghezza la descrizione esce fuori dalla card
export const DESCRIPTION_MAX_LENGTH = 300;

// per la retrocompatibilità con le ricette vecchie, che avevano gli ingredienti come stringa:
export function parseIngredients(rawIngredients) {
    if (!rawIngredients || typeof rawIngredients !== "string") {
        return [];
    }

    const byLine = rawIngredients
        .split("\n")
        .map((line) => line.replace(/^[-*•]\s*/, "").trim())
        .filter(Boolean);

    if (byLine.length > 1) {
        return byLine;
    }

    return (byLine[0] ?? "")
        .split(",")
        .map((piece) => piece.trim())
        .filter(Boolean);
}

export function normalizeIngredients(rawIngredients) {
    if (Array.isArray(rawIngredients)) {
        return rawIngredients
            .filter((ingredient) => ingredient && ingredient.name)
            .map((ingredient) => ({
                name: ingredient.name,
                quantity: ingredient.quantity || ""
            }));
    }

    return parseIngredients(rawIngredients).map((name) => ({
        name,
        quantity: ""
    }));
}

export function extractMlValue(quantity) {
    if (!quantity) {
        return "";
    }

    const match = String(quantity).match(/\d+/);

    return match ? match[0] : "";
}

export function countIngredients(rawIngredients) {
    return normalizeIngredients(rawIngredients).length;
}

export function initialOf(user) {
    const source = user?.displayName || user?.email || "?";

    return source.trim().charAt(0).toUpperCase();
}

function trimmed(value) {
    return String(value ?? "").trim();
}

// le righe senza nome sono slot vuoti e le butto via. la quantità invece
// è facoltativa 
function cleanRows(rows, unit) {
    return rows
        .filter((row) => row && row.name)
        .map((row) => {
            const quantity = trimmed(row.quantity);

            return {
                name: row.name,
                quantity: quantity && unit ? `${quantity} ${unit}` : quantity
            };
        });
}

export function buildIngredients({ alcoholic = [], nonAlcoholic = [], extras = [] }) {
    return [
        ...cleanRows(alcoholic, "ml"),
        ...cleanRows(nonAlcoholic, "ml"),
        ...cleanRows(extras, "")
    ];
}
