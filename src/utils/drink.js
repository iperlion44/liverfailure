// Ricette vecchie: testo libero, a capo o separato da virgole.
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

// Le ricette vecchie hanno una stringa libera come ingredienti, quelle
// nuove un array di { name, quantity }: qui uniformiamo alla stessa forma.
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

// Estrae la parte numerica da una quantità in ml ("50 ml" -> "50") per
// il campo numerico del form di modifica.
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
