export const PARTY_CODE_LENGTH = 6;

// il codice si detta a voce in mezzo alla festa: fuori I, L, O, 0 e 1
// perché al telefono nessuno capisce la differenza
const CODE_ALPHABET = "ABCDEFGHJKMNPQRSTUVWXYZ23456789";

export function normalizePartyCode(value) {
    return String(value ?? "")
        .toUpperCase()
        .replace(/[^A-Z0-9]/g, "")
        .slice(0, PARTY_CODE_LENGTH);
}

export function isValidPartyCode(value) {
    return normalizePartyCode(value).length === PARTY_CODE_LENGTH;
}

export function generatePartyCode(random = Math.random) {
    let code = "";

    for (let index = 0; index < PARTY_CODE_LENGTH; index += 1) {
        const position = Math.floor(random() * CODE_ALPHABET.length);

        code += CODE_ALPHABET[Math.min(position, CODE_ALPHABET.length - 1)];
    }

    return code;
}

export function formatPartyCode(value) {
    const code = normalizePartyCode(value);

    // spezzato a metà si legge e si ricopia molto meglio
    return code.length === PARTY_CODE_LENGTH ? `${code.slice(0, 3)} ${code.slice(3)}` : code;
}
