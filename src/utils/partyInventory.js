import { extractMlValue, normalizeIngredients } from "./drink.js";
import { isAlcoholic, isExtra } from "./spirits.js";

// alcolici e analcolici li conto in ml, gli extra no: nessuno pesa il
// ghiaccio o le foglie di menta a metà serata
export const DEFAULT_BOTTLE_ML = 700;
export const DEFAULT_MIXER_ML = 1000;

export function emptyPartyInventory() {
    return { amounts: {}, extras: [], removedDrinks: [] };
}

export function defaultAmountFor(name) {
    return isAlcoholic(name) ? DEFAULT_BOTTLE_ML : DEFAULT_MIXER_ML;
}

// un ingrediente a 0 ml o meno è come se non fosse più sul bancone: lo
// tolgo qui così torna da solo tra i mancanti ovunque venga letto
// l'inventario, senza dover premere "Togli" a mano
export function normalizePartyInventory(raw) {
    const amounts = {};
    const source = raw && typeof raw.amounts === "object" && raw.amounts ? raw.amounts : {};

    Object.keys(source).forEach((name) => {
        const amount = Number(source[name]);

        if (name && Number.isFinite(amount) && amount > 0) {
            amounts[name] = Math.round(amount);
        }
    });

    const extras = Array.isArray(raw?.extras)
        ? [...new Set(raw.extras.filter((name) => typeof name === "string" && name.length > 0))]
        : [];

    const removedDrinks = Array.isArray(raw?.removedDrinks)
        ? [...new Set(raw.removedDrinks.filter((id) => typeof id === "string" && id.length > 0))]
        : [];

    return { amounts, extras, removedDrinks };
}

// il bar può togliere un drink dal bancone anche se gli ingredienti ci
// sono: non è una questione di scorte, è una scelta di servizio
export function isRemovedFromBar(inventory, drinkId) {
    return normalizePartyInventory(inventory).removedDrinks.includes(drinkId);
}

export function requiredAmount(ingredient) {
    const value = Number(extractMlValue(ingredient?.quantity));

    return Number.isFinite(value) && value > 0 ? value : 0;
}

export function availableIngredients(inventory) {
    const { amounts, extras } = normalizePartyInventory(inventory);

    const available = new Set(extras);

    Object.keys(amounts).forEach((name) => {
        if (amounts[name] > 0) {
            available.add(name);
        }
    });

    return available;
}

// se la ricetta cita due volte lo stesso ingrediente devo scalare la
// somma, non l'ultima riga che ho letto
export function aggregateRequirements(rawIngredients) {
    const requirements = new Map();

    normalizeIngredients(rawIngredients).forEach((ingredient) => {
        if (!ingredient.name) {
            return;
        }

        const existing = requirements.get(ingredient.name);
        const needed = requiredAmount(ingredient);

        if (existing) {
            existing.needed += needed;
            return;
        }

        requirements.set(ingredient.name, {
            name: ingredient.name,
            needed,
            countedByAmount: !isExtra(ingredient.name)
        });
    });

    return [...requirements.values()];
}

export function missingForDrink(inventory, rawIngredients) {
    const { amounts, extras } = normalizePartyInventory(inventory);
    const availableExtras = new Set(extras);

    return aggregateRequirements(rawIngredients)
        .map((requirement) => {
            if (!requirement.countedByAmount) {
                return availableExtras.has(requirement.name)
                    ? null
                    : { name: requirement.name, needed: 0, available: 0, reason: "assente" };
            }

            const available = amounts[requirement.name] ?? 0;

            if (available <= 0) {
                return { name: requirement.name, needed: requirement.needed, available: 0, reason: "assente" };
            }

            if (requirement.needed > 0 && available < requirement.needed) {
                return {
                    name: requirement.name,
                    needed: requirement.needed,
                    available,
                    reason: "insufficiente"
                };
            }

            return null;
        })
        .filter(Boolean);
}

export function canPrepare(inventory, rawIngredients) {
    return (
        normalizeIngredients(rawIngredients).length > 0 &&
        missingForDrink(inventory, rawIngredients).length === 0
    );
}

// il cuore della transazione: o scala tutto, o non tocca niente e dice
// cosa manca. così due bartender sull'ultimo bicchiere non mandano
// l'inventario sotto zero
export function consumeDrink(inventory, rawIngredients) {
    const current = normalizePartyInventory(inventory);
    const missing = missingForDrink(current, rawIngredients);

    if (missing.length > 0) {
        return { ok: false, inventory: current, missing };
    }

    const amounts = { ...current.amounts };

    aggregateRequirements(rawIngredients).forEach((requirement) => {
        if (!requirement.countedByAmount) {
            return;
        }

        const available = amounts[requirement.name] ?? 0;
        const remaining = available - requirement.needed;

        if (remaining > 0) {
            amounts[requirement.name] = remaining;
        } else {
            delete amounts[requirement.name];
        }
    });

    return {
        ok: true,
        inventory: { amounts, extras: [...current.extras], removedDrinks: [...current.removedDrinks] },
        missing: []
    };
}

// punto di partenza dell'inventario della festa: la dispensa personale
// dell'host, con quantità di default che poi corregge a mano
export function buildPartyInventory(pantry = [], previous = null) {
    const existing = normalizePartyInventory(previous);
    const amounts = {};
    const extras = [];

    pantry
        .filter((name) => typeof name === "string" && name.length > 0)
        .forEach((name) => {
            if (isExtra(name)) {
                if (!extras.includes(name)) {
                    extras.push(name);
                }

                return;
            }

            amounts[name] = existing.amounts[name] ?? defaultAmountFor(name);
        });

    return { amounts, extras };
}

// quando la dispensa personale cambia, propago solo le aggiunte al
// bancone delle feste aperte: mai una rimozione automatica, sennò
// sparirebbe qualcosa che il bar ha messo a mano e che magari non sta
// nemmeno nella dispensa (portato da un ospite, per esempio)
export function addPantryToPartyInventory(pantry = [], previous = null) {
    const current = normalizePartyInventory(previous);
    const amounts = { ...current.amounts };
    const extras = new Set(current.extras);

    pantry
        .filter((name) => typeof name === "string" && name.length > 0)
        .forEach((name) => {
            if (isExtra(name)) {
                extras.add(name);
                return;
            }

            if (!(name in amounts)) {
                amounts[name] = defaultAmountFor(name);
            }
        });

    return { amounts, extras: [...extras] };
}

// il bar corregge il bancone mentre gli ordini continuano a scalarlo.
// Se salvassi la mia copia così com'è, rimetterei a posto i millilitri
// che qualcuno ha già versato: applico solo quello che ho cambiato io
// rispetto a quando ho iniziato a modificare, e il resto lo lascio come
// sta adesso sul server.
export function mergePartyInventory(base, edited, server) {
    const from = normalizePartyInventory(base);
    const mine = normalizePartyInventory(edited);
    const current = normalizePartyInventory(server);

    const amounts = { ...current.amounts };

    Object.keys(from.amounts).forEach((name) => {
        if (!(name in mine.amounts)) {
            delete amounts[name];
        }
    });

    Object.keys(mine.amounts).forEach((name) => {
        const touched = !(name in from.amounts) || from.amounts[name] !== mine.amounts[name];

        if (touched) {
            amounts[name] = mine.amounts[name];
        }
    });

    const extras = new Set(current.extras);

    from.extras.forEach((name) => {
        if (!mine.extras.includes(name)) {
            extras.delete(name);
        }
    });

    mine.extras.forEach((name) => {
        if (!from.extras.includes(name)) {
            extras.add(name);
        }
    });

    // l'editor del bancone non tocca i drink tolti dal menù: qui prendo
    // sempre quelli che stanno sul server adesso, sennò salvando le dosi
    // rimetterei in menù un drink che un altro bartender ha appena tolto
    return { amounts, extras: [...extras], removedDrinks: current.removedDrinks };
}

export function missingLabel(missing = []) {
    if (missing.length === 0) {
        return "";
    }

    return missing
        .map((item) =>
            item.reason === "insufficiente"
                ? `${item.name} (restano ${item.available} ml, ne servono ${item.needed})`
                : item.name
        )
        .join(", ");
}
