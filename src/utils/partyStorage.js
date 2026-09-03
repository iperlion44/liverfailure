import { writeCache } from "./localCache.js";
import { normalizePartyCode } from "./partyCode.js";

// le feste a cui ho partecipato non le posso ritrovare con una query
// quindi mi segno i codici qui sul dispositivo
export const getPartiesCacheKey = (uid) => `parties-${uid}`;

const MAX_REMEMBERED = 6;

function getStorage() {
    if (typeof globalThis === "undefined") {
        return null;
    }

    return globalThis.localStorage ?? null;
}

export function readRememberedParties(uid) {
    if (!uid) {
        return [];
    }

    const storage = getStorage();

    if (!storage) {
        return [];
    }

    try {
        const raw = storage.getItem(getPartiesCacheKey(uid));
        const parsed = raw ? JSON.parse(raw) : [];

        return Array.isArray(parsed)
            ? parsed.filter((party) => party && typeof party.code === "string")
            : [];
    } catch (error) {
        console.error("Errore lettura feste cache:", error);
        return [];
    }
}

function writeRememberedParties(uid, parties) {
    const storage = getStorage();

    if (!storage) {
        return;
    }

    writeCache(storage, getPartiesCacheKey(uid), parties, "Errore salvataggio feste cache:");
}

export function rememberParty(uid, party) {
    const code = normalizePartyCode(party?.code);

    if (!uid || !code) {
        return readRememberedParties(uid);
    }

    const entry = {
        code,
        name: String(party?.name ?? "").slice(0, 60),
        role: party?.role === "bar" ? "bar" : "cliente"
    };

    // la più recente in cima, senza doppioni
    const next = [entry, ...readRememberedParties(uid).filter((saved) => saved.code !== code)].slice(
        0,
        MAX_REMEMBERED
    );

    writeRememberedParties(uid, next);

    return next;
}

export function forgetParty(uid, code) {
    const normalized = normalizePartyCode(code);
    const next = readRememberedParties(uid).filter((saved) => saved.code !== normalized);

    writeRememberedParties(uid, next);

    return next;
}
