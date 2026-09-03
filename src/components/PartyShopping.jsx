import { useMemo, useState } from "react";
import { Link } from "react-router-dom";

import {
    MAX_PARTY_PEOPLE,
    MIN_PARTY_PEOPLE,
    buildPartyShoppingList,
    formatVolume,
    normalizeEstimatedPeople,
    partyShoppingText,
    shoppingRowLabel
} from "../utils/partyShopping";
import { peopleLabel } from "../utils/quantityScale";
import EmptyState from "./EmptyState";
import { IconPlus } from "./NavIcons";

// la scheda "Spesa" della fase di preparazione: dato il menù scelto e
// quante persone si aspettano, dice quanto serve di ogni ingrediente
// perché ognuno possa ordinare almeno una volta ogni drink. Il conto
// tiene già da parte quello che c'è sul bancone, così quello che resta
// è davvero la lista da portare al supermercato.
//
// Il numero di persone non è roba di questa scheda: lo tiene la stanza
// (PartyRoom), sennò cambiando scheda mentre il salvataggio è ancora in
// attesa il numero appena scritto sparirebbe.
function PartyShopping({
    drinks = [],
    inventory,
    pantry = [],
    people,
    peopleNotSet = false,
    saveFailed = false,
    canEdit = true,
    onChangePeople,
    onRetryPeople,
    onToggleBought
}) {
    const [typed, setTyped] = useState(null);
    const [copied, setCopied] = useState(false);

    const rows = useMemo(
        () => buildPartyShoppingList({ drinks, people, inventory, pantry }),
        [drinks, people, inventory, pantry]
    );

    const toBuy = rows.filter((row) => !row.enough);

    const commit = (next) => {
        if (next !== people) {
            onChangePeople(next);
        }
    };

    const changePeople = (delta) => {
        setTyped(null);
        commit(Math.min(MAX_PARTY_PEOPLE, Math.max(MIN_PARTY_PEOPLE, people + delta)));
    };

    const typePeople = (value) => {
        setTyped(value);

        const parsed = normalizeEstimatedPeople(value);

        if (parsed > 0) {
            commit(parsed);
        }
    };

    const handleCopy = async () => {
        try {
            await navigator.clipboard.writeText(partyShoppingText(rows));
            setCopied(true);
        } catch (error) {
            console.error(error);
            setCopied(false);
        }
    };

    if (drinks.length === 0) {
        return (
            <EmptyState
                title="Prima il menù, poi la spesa"
                body="Scegli i drink della festa e qui trovi quanto comprare di ogni ingrediente."
            >
                <Link to="/explore" className="btn btn-primary btn-hero">
                    <IconPlus />
                    Scegli da Esplora
                </Link>
            </EmptyState>
        );
    }

    return (
        <div className="party-shopping">
            <div className="shopping-head">
                <div className="party-shopping-people">
                    <span className="field-label">Quante persone aspetti?</span>
                    <span className="field-hint">
                        {peopleNotSet
                            ? "Non l'hai indicato: sto contando per una persona."
                            : `Dosi per far ordinare a ognuno tutti i ${drinks.length} drink del menù.`}
                    </span>
                </div>

                <div className="stepper">
                    <button
                        type="button"
                        className="stepper-btn"
                        onClick={() => changePeople(-1)}
                        disabled={!canEdit || people <= MIN_PARTY_PEOPLE}
                        aria-label="Una persona in meno"
                    >
                        −
                    </button>
                    <input
                        type="number"
                        inputMode="numeric"
                        className="stepper-input"
                        min={MIN_PARTY_PEOPLE}
                        max={MAX_PARTY_PEOPLE}
                        step="1"
                        aria-label="Persone attese alla festa"
                        value={typed ?? String(people)}
                        disabled={!canEdit}
                        onChange={(event) => typePeople(event.target.value)}
                        onBlur={() => setTyped(null)}
                    />
                    <span className="stepper-unit" aria-live="polite">
                        {people === 1 ? "persona" : "persone"}
                    </span>
                    <button
                        type="button"
                        className="stepper-btn"
                        onClick={() => changePeople(1)}
                        disabled={!canEdit || people >= MAX_PARTY_PEOPLE}
                        aria-label="Una persona in più"
                    >
                        +
                    </button>
                </div>
            </div>

            {/* il numero resta quello scritto anche se il salvataggio non
                è andato: qui si riprova senza doverlo ribattere */}
            {saveFailed && (
                <div className="notice notice-error" role="alert">
                    Non sono riuscito a salvare {peopleLabel(people)} sulla festa: il conto qui sotto è
                    giusto, ma sugli altri dispositivi resta il numero di prima.
                    <button type="button" className="btn btn-outline btn-sm" onClick={onRetryPeople}>
                        Riprova
                    </button>
                </div>
            )}

            <div className="shopping">
                <div className="shopping-head">
                    <span className="field-label">
                        {toBuy.length === 0 ? "Preso tutto" : "Da comprare"}
                    </span>

                    {toBuy.length > 0 && (
                        <button type="button" className="btn btn-outline btn-sm" onClick={handleCopy}>
                            {copied ? "Lista copiata" : "Copia la lista"}
                        </button>
                    )}
                </div>

                {/* lista della spesa vera: le righe non si spostano e non
                    spariscono quando si spuntano, si barrano e restano al
                    loro posto. La spunta non è un promemoria: mette
                    davvero l'ingrediente sul bancone, con la quantità che
                    serve per tutti gli invitati */}
                <ul className="shopping-list">
                    {rows.map((row) => {
                        // tre stati, non due: preso, ce l'hai ma per quante
                        // persone aspetti non basta, non ce l'hai proprio.
                        
                        const short = !row.enough && row.owned;
                        const classNames = [row.enough ? "is-bought" : "", short ? "is-short" : ""]
                            .filter(Boolean)
                            .join(" ");

                        return (
                            <li className={classNames || undefined} key={row.name}>
                                <label>
                                    <input
                                        type="checkbox"
                                        checked={row.enough}
                                        aria-label={`${row.name} preso`}
                                        onChange={(event) => onToggleBought(row, event.target.checked)}
                                    />
                                    <span className="shopping-line">
                                        <span>{row.name}</span>

                                        {short && row.countedByAmount && (
                                            <span className="shopping-note">
                                                sul bancone ne hai {formatVolume(row.available)}, per{" "}
                                                {peopleLabel(people)} ne servono {shoppingRowLabel(row)}
                                            </span>
                                        )}

                                        {/* ce l'ha in casa ma non l'ha ancora
                                            portato alla festa: spuntare qui è
                                            proprio il gesto che lo porta */}
                                        {row.onlyInPantry && (
                                            <span className="shopping-note">
                                                ce l&apos;hai in dispensa: spunta per metterlo sul bancone
                                            </span>
                                        )}
                                    </span>
                                </label>

                                <span className="ingredient-qty">
                                    {!row.enough && row.countedByAmount && row.toBuy > 0
                                        ? formatVolume(row.toBuy)
                                        : shoppingRowLabel(row)}
                                </span>
                            </li>
                        );
                    })}
                </ul>

                {toBuy.length === 0 && (
                    <p className="pantry-verdict shopping-done">
                        Il bancone basta per {peopleLabel(people)}.
                    </p>
                )}
            </div>
        </div>
    );
}

export default PartyShopping;
