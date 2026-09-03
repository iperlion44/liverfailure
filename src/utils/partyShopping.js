import { toInventorySet } from "./inventoryMatch.js";
import {
    aggregateRequirements,
    defaultAmountFor,
    normalizePartyInventory
} from "./partyInventory.js";

// quante persone si possono stimare a una festa: zero vuol dire "non
// l'ho detto"
export const MIN_PARTY_PEOPLE = 1;
export const MAX_PARTY_PEOPLE = 200;

export function normalizeEstimatedPeople(value) {
    const number = Math.round(Number(value));

    if (!Number.isFinite(number) || number <= 0) {
        return 0;
    }

    return Math.min(number, MAX_PARTY_PEOPLE);
}

// per fare i conti una persona ci vuole per forza: se l'host non ha
// indicato niente mostro le dosi per uno
export function peopleForShopping(value) {
    return Math.max(MIN_PARTY_PEOPLE, normalizeEstimatedPeople(value));
}
//consiglio AI:
// sotto il litro i millilitri si leggono meglio, sopra no: "2,1 l" dice
// più di "2100 ml"
export function formatVolume(ml) {
    const value = Math.round(Number(ml) || 0);

    if (value < 1000) {
        return `${value} ml`;
    }

    const liters = value / 1000;

    return `${(Number.isInteger(liters) ? String(liters) : liters.toFixed(1)).replace(".", ",")} l`;
}

// la spesa della festa: per ogni ingrediente del menù la quantità che
// serve perché ognuno degli invitati possa ordinare almeno una volta
// ogni drink. Quindi la somma delle dosi di tutti i drink scelti,
// moltiplicata per le persone attese.

export function buildPartyShoppingList({
    drinks = [],
    people = 1,
    inventory = null,
    pantry = []
} = {}) {
    const times = peopleForShopping(people);
    const { amounts, extras } = normalizePartyInventory(inventory);
    const availableExtras = new Set(extras);

    // La dispensa personale serve solo a non dare per assente quello che
    // l'host ha in casa (le schede Prepara e Bancone la contano, e due
    // schede vicine non possono dire il contrario). Ma NON decide lo
    // stato della riga: la spunta accende e spegne il bancone della
    // festa, e se la dispensa potesse tenerla accesa toglierla non
    // avrebbe alcun effetto — con una dispensa piena la checklist
    // smetterebbe proprio di funzionare.
    const inPantry = toInventorySet(pantry);

    const totals = new Map();

    drinks.forEach((drink) => {
        aggregateRequirements(drink?.ingredients).forEach((requirement) => {
            const existing = totals.get(requirement.name);

            if (existing) {
                existing.perRound += requirement.needed;
                return;
            }

            totals.set(requirement.name, {
                name: requirement.name,
                perRound: requirement.needed,
                countedByAmount: requirement.countedByAmount
            });
        });
    });

    return [...totals.values()]
        .map((item) => {
            if (!item.countedByAmount) {
                const onBar = availableExtras.has(item.name);

                return {
                    name: item.name,
                    countedByAmount: false,
                    needed: 0,
                    available: 0,
                    onlyInPantry: !onBar && inPantry.has(item.name),
                    toBuy: 0,
                    owned: onBar,
                    enough: onBar
                };
            }

            const needed = item.perRound * times;
            const available = amounts[item.name] ?? 0;
            const owned = available > 0;

            return {
                name: item.name,
                countedByAmount: true,
                needed,
                available,
                // la dispensa non entra nello stato della riga, solo nel
                // testo: dice "ce l'hai in casa", non quanto ce n'è, e
                // soprattutto non è quello che la spunta accende e spegne
                onlyInPantry: !owned && inPantry.has(item.name),
                toBuy: Math.max(0, needed - available),
                // "ce l'ho" e "ne ho abbastanza per tutti" sono due cose
                // diverse: chi ha la bottiglia non deve mai leggere che gli
                // manca, al massimo che per quante persone aspetta gliene
                // serve dell'altra
                owned,
                // una ricetta può citare un ingrediente senza dose ("q.b."
                // anche su una bottiglia): lì non ho un numero da
                // confrontare, mi basta che sul bancone ci sia qualcosa
                enough: owned && (needed > 0 ? available >= needed : true)
            };
        })
        .sort((first, second) => first.name.localeCompare(second.name, "it"));
}

// spuntare una riga vuol dire "questo l'ho preso": sul bancone finisce
// la quantità che la lista chiedeva, cioè quella che basta per tutti gli
// invitati (mai meno di quello che c'era già, che magari è di più).
// Togliere la spunta la rimette tra le cose da comprare, esattamente
// come il "Togli" del bancone
export function toggleBoughtIngredient(inventory, row, bought) {
    const current = normalizePartyInventory(inventory);
    const amounts = { ...current.amounts };
    const extras = new Set(current.extras);

    if (!row?.name) {
        return { amounts, extras: [...extras], removedDrinks: [...current.removedDrinks] };
    }

    if (!row.countedByAmount) {
        if (bought) {
            extras.add(row.name);
        } else {
            extras.delete(row.name);
        }
    } else if (bought) {
        // una ricetta può citare una bottiglia senza dose
        const target = row.needed > 0 ? row.needed : defaultAmountFor(row.name);

        amounts[row.name] = Math.max(target, current.amounts[row.name] ?? 0);
    } else {
        delete amounts[row.name];
    }

    return { amounts, extras: [...extras], removedDrinks: [...current.removedDrinks] };
}

// la riga che si legge nella lista e che finisce anche negli appunti
export function shoppingRowLabel(row) {
    if (!row.countedByAmount) {
        return "q.b.";
    }

    return row.needed > 0 ? formatVolume(row.needed) : "q.b.";
}

export function partyShoppingText(rows = []) {
    return rows
        .filter((row) => !row.enough)
        .map((row) => {
            if (!row.countedByAmount) {
                return `${row.name} — q.b.`;
            }

            return row.toBuy > 0
                ? `${row.name} — ${formatVolume(row.toBuy)}`
                : `${row.name} — ${shoppingRowLabel(row)}`;
        })
        .join("\n");
}
