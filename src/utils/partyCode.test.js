import test from "node:test";
import assert from "node:assert/strict";

import {
    PARTY_CODE_LENGTH,
    formatPartyCode,
    generatePartyCode,
    isValidPartyCode,
    normalizePartyCode
} from "./partyCode.js";

test("normalizePartyCode ripulisce quello che scrive l'utente", () => {
    assert.equal(normalizePartyCode(" ab3-k9z "), "AB3K9Z");
    assert.equal(normalizePartyCode("AB3K9ZXXXX"), "AB3K9Z");
    assert.equal(normalizePartyCode(null), "");
});

test("isValidPartyCode vuole esattamente sei caratteri", () => {
    assert.equal(isValidPartyCode("AB3K9Z"), true);
    assert.equal(isValidPartyCode("ab3k9z"), true);
    assert.equal(isValidPartyCode("AB3K9"), false);
    assert.equal(isValidPartyCode(""), false);
});

test("generatePartyCode produce codici validi e senza lettere ambigue", () => {
    let seed = 0;
    const finto = () => {
        seed += 0.137;
        return seed % 1;
    };

    for (let index = 0; index < 50; index += 1) {
        const code = generatePartyCode(finto);

        assert.equal(code.length, PARTY_CODE_LENGTH);
        assert.equal(isValidPartyCode(code), true);
        assert.equal(/[ILO01]/.test(code), false);
    }
});

test("generatePartyCode regge un random che ritorna 1", () => {
    assert.equal(generatePartyCode(() => 1).length, PARTY_CODE_LENGTH);
});

test("formatPartyCode spezza il codice a metà", () => {
    assert.equal(formatPartyCode("ab3k9z"), "AB3 K9Z");
    assert.equal(formatPartyCode("AB3"), "AB3");
});
