import { useMemo, useState } from "react";
import { Link } from "react-router-dom";

import { useAuth } from "../context/useAuth";
import { useInventory } from "../context/useInventory";
import { buildChecklist, matchDrink } from "../utils/inventoryMatch";
import {
    MAX_PEOPLE,
    MIN_PEOPLE,
    buildShoppingList,
    peopleLabel,
    shoppingListText
} from "../utils/quantityScale";
import MatchBadge from "./MatchBadge";
import { IconBottle } from "./NavIcons";

function CheckMark({ owned }) {
    return (
        <span className={owned ? "checklist-mark is-owned" : "checklist-mark"} aria-hidden="true">
            {owned ? (
                <svg width="12" height="12" viewBox="0 0 14 14" fill="none">
                    <path
                        d="M2.5 7.2 L5.6 10.3 L11.5 3.8"
                        stroke="currentColor"
                        strokeWidth="1.8"
                        strokeLinecap="round"
                        strokeLinejoin="round"
                    />
                </svg>
            ) : (
                <svg width="12" height="12" viewBox="0 0 14 14" fill="none">
                    <path
                        d="M4 4 L10 10 M10 4 L4 10"
                        stroke="currentColor"
                        strokeWidth="1.6"
                        strokeLinecap="round"
                    />
                </svg>
            )}
        </span>
    );
}

// "Cosa ti serve": la ricetta confrontata riga per riga con la dispensa,
// e la lista della spesa già moltiplicata per quante persone servi
function PantryPanel({ ingredients }) {
    const { user } = useAuth();
    const { inventory, inventorySet, loading } = useInventory();

    const [people, setPeople] = useState(MIN_PEOPLE);
    const [copied, setCopied] = useState(false);

    const checklist = useMemo(
        () => buildChecklist(ingredients, inventorySet),
        [ingredients, inventorySet]
    );

    const match = useMemo(
        () => matchDrink(ingredients, inventorySet),
        [ingredients, inventorySet]
    );

    const shoppingList = useMemo(
        () => buildShoppingList(match.missing, people),
        [match.missing, people]
    );

    if (!user || loading) {
        return null;
    }

    if (inventory.length === 0) {
        return (
            <section className="pantry-panel">
                <h2 className="recipe-block-title">Lo puoi fare?</h2>
                <div className="form-actions">
                    <Link to="/inventory" className="btn btn-primary btn-hero">
                        <IconBottle />
                        Riempi la dispensa
                    </Link>
                </div>
            </section>
        );
    }

    const changePeople = (delta) => {
        setCopied(false);
        setPeople((previous) =>
            Math.min(MAX_PEOPLE, Math.max(MIN_PEOPLE, previous + delta))
        );
    };

    const handleCopy = async () => {
        try {
            await navigator.clipboard.writeText(shoppingListText(shoppingList));
            setCopied(true);
        } catch (error) {
            console.error(error);
            setCopied(false);
        }
    };

    return (
        <section className="pantry-panel">
            <h2 className="recipe-block-title">Cosa ti serve</h2>

            {match.missing.length === 0 ? (
                <p className="pantry-verdict">
                    <MatchBadge match={match} />
                    Hai tutto quello che serve.
                </p>
            ) : (
                <p className="pantry-verdict">
                    {match.missing.length === 1
                        ? "Ti manca un ingrediente solo."
                        : `Ti mancano ${match.missing.length} ingredienti.`}
                </p>
            )}

            <ul className="checklist">
                {checklist.map((ingredient, index) => (
                    <li
                        key={`${ingredient.name}-${index}`}
                        className={ingredient.owned ? "checklist-item is-owned" : "checklist-item"}
                    >
                        <CheckMark owned={ingredient.owned} />
                        <span>{ingredient.name}</span>
                        {ingredient.quantity && (
                            <span className="ingredient-qty">{ingredient.quantity}</span>
                        )}
                    </li>
                ))}
            </ul>

            {match.missing.length > 0 && (
                <div className="shopping">
                    <div className="shopping-head">
                        <span className="field-label">Per quante persone?</span>

                        <div className="stepper">
                            <button
                                type="button"
                                className="stepper-btn"
                                onClick={() => changePeople(-1)}
                                disabled={people <= MIN_PEOPLE}
                                aria-label="Una persona in meno"
                            >
                                −
                            </button>
                            <span className="stepper-value" aria-live="polite">
                                {peopleLabel(people)}
                            </span>
                            <button
                                type="button"
                                className="stepper-btn"
                                onClick={() => changePeople(1)}
                                disabled={people >= MAX_PEOPLE}
                                aria-label="Una persona in più"
                            >
                                +
                            </button>
                        </div>
                    </div>

                    <ul className="shopping-list">
                        {shoppingList.map((item) => (
                            <li key={item.name}>
                                <span>{item.name}</span>
                                <span className="ingredient-qty">{item.quantity || "q.b."}</span>
                            </li>
                        ))}
                    </ul>

                    <div className="form-actions">
                        <button type="button" className="btn btn-outline btn-sm" onClick={handleCopy}>
                            {copied ? "Lista copiata" : "Copia la lista"}
                        </button>
                    </div>
                </div>
            )}
        </section>
    );
}

export default PantryPanel;
