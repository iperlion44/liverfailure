// oltre questa lunghezza la descrizione esce fuori dalla card, l'ho
// provato e 300 sembra il punto giusto
export const DESCRIPTION_MAX_LENGTH = 300;

// le ricette più vecchie avevano gli ingredienti come testo libero
// (a capo o separati da virgola), questa funzione le legge lo stesso
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

// le ricette vecchie hanno gli ingredienti come stringa, quelle nuove
// come array di { name, quantity }. qui li riporto tutti alla stessa forma
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

// prende solo il numero da una quantità tipo "50 ml" -> "50", mi
// serve per il campo number nel form di modifica
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
// è facoltativa (mi ero dimenticato di gestirlo e le righe con solo il
// nome sparivano in silenzio al salvataggio, bug fastidioso da trovare)
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
