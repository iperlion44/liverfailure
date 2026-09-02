import { doc, getDoc, setDoc } from "firebase/firestore";

import db from "./firestore";
import { EXTRAS, NON_ALCOHOLIC, SPIRITS } from "../utils/spirits";

// la dispensa deve restare nel vocabolario chiuso usato per creare i
// drink: se ci finisce dentro testo libero il matching non aggancia
// più niente
const KNOWN_INGREDIENTS = new Set([...SPIRITS, ...NON_ALCOHOLIC, ...EXTRAS]);

export function sanitizeInventory(inventory) {
    if (!Array.isArray(inventory)) {
        return [];
    }

    return [...new Set(inventory.filter((name) => KNOWN_INGREDIENTS.has(name)))].sort((first, second) =>
        first.localeCompare(second, "it")
    );
}

export async function fetchInventory(uid) {
    if (!uid) {
        return [];
    }

    const snapshot = await getDoc(doc(db, "users", uid));

    return snapshot.exists() ? sanitizeInventory(snapshot.data().inventory) : [];
}

export async function saveInventory(uid, inventory) {
    const clean = sanitizeInventory(inventory);

    await setDoc(doc(db, "users", uid), { inventory: clean }, { merge: true });

    return clean;
}
