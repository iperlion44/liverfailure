import { useMemo, useState } from "react";
import { Link } from "react-router-dom";

import { canPrepare, missingForDrink, normalizePartyInventory } from "../utils/partyInventory";
import { normalizeIngredients } from "../utils/drink";
import EmptyState from "./EmptyState";

function ingredientSummary(drink) {
    return normalizeIngredients(drink.ingredients)
        .map((ingredient) => ingredient.name)
        .join(" · ");
}

// il menù è calcolato in tempo reale sull'inventario della festa: quando
// una bottiglia finisce il drink va tra i non disponibili da solo.
// i drink tolti dal bancone sono una scelta a parte del bar: anche con
// tutti gli ingredienti a disposizione restano fuori dal menù ordinabile
function PartyMenu({
    drinks,
    inventory,
    onOrder,
    ordering = "",
    canOrder = true,
    isBar = false,
    onToggleRemoved
}) {
    const [showUnavailable, setShowUnavailable] = useState(false);
    const [showRemoved, setShowRemoved] = useState(false);

    const removedDrinks = useMemo(() => normalizePartyInventory(inventory).removedDrinks, [inventory]);

    const { available, unavailable, removed } = useMemo(() => {
        const ready = [];
        const missing = [];
        const takenOff = [];

        drinks.forEach((drink) => {
            if (removedDrinks.includes(drink.id)) {
                takenOff.push(drink);
                return;
            }

            if (canPrepare(inventory, drink.ingredients)) {
                ready.push(drink);
                return;
            }

            missing.push({ drink, missing: missingForDrink(inventory, drink.ingredients) });
        });

        return { available: ready, unavailable: missing, removed: takenOff };
    }, [drinks, inventory, removedDrinks]);

    if (drinks.length === 0) {
        return (
            <EmptyState title="Non c'è niente da ordinare" />
        );
    }

    return (
        <div className="party-menu">
            {available.length === 0 ? (
                <div className="notice">Bancone scarico: non esce nessun drink.</div>
            ) : (
                <ul className="menu-list">
                    {available.map((drink) => (
                        <li className="menu-item" key={drink.id}>
                            <div className="menu-item-text">
                                <Link to={`/drink/${drink.id}`} className="menu-item-name">
                                    {drink.name}
                                </Link>
                                <span className="menu-item-ingredients">
                                    {ingredientSummary(drink)}
                                </span>
                            </div>

                            <div className="order-actions">
                                {isBar && (
                                    <button
                                        type="button"
                                        className="btn btn-quiet btn-sm"
                                        onClick={() => onToggleRemoved(drink, true)}
                                        disabled={ordering === drink.id}
                                    >
                                        Togli
                                    </button>
                                )}

                                <button
                                    type="button"
                                    className="btn btn-primary"
                                    onClick={() => onOrder(drink)}
                                    disabled={!canOrder || ordering === drink.id}
                                >
                                    {ordering === drink.id ? "Ordino..." : "Ordina"}
                                </button>
                            </div>
                        </li>
                    ))}
                </ul>
            )}

            <div className="menu-toggles">
                {unavailable.length > 0 && (
                    <div className="menu-unavailable">
                        <button
                            type="button"
                            className="btn btn-quiet btn-sm"
                            onClick={() => setShowUnavailable((previous) => !previous)}
                            aria-expanded={showUnavailable}
                        >
                            {showUnavailable ? "Nascondi" : "Mostra"} i {unavailable.length} drink
                            {unavailable.length === 1 ? " non disponibile" : " non disponibili"}
                        </button>

                        {showUnavailable && (
                            <ul className="menu-list menu-list-muted">
                                {unavailable.map(({ drink, missing }) => (
                                    <li className="menu-item" key={drink.id}>
                                        <div className="menu-item-text">
                                            <Link to={`/drink/${drink.id}`} className="menu-item-name">
                                                {drink.name}
                                            </Link>
                                            <span className="menu-item-ingredients">
                                                Manca: {missing.map((item) => item.name).join(", ")}
                                            </span>
                                        </div>

                                        {isBar && (
                                            <button
                                                type="button"
                                                className="btn btn-outline btn-sm"
                                                onClick={() => onToggleRemoved(drink, true)}
                                                disabled={ordering === drink.id}
                                            >
                                                Togli dal bancone
                                            </button>
                                        )}
                                    </li>
                                ))}
                            </ul>
                        )}
                    </div>
                )}

                {removed.length > 0 && (
                    <div className="menu-unavailable">
                        <button
                            type="button"
                            className="btn btn-quiet btn-sm"
                            onClick={() => setShowRemoved((previous) => !previous)}
                            aria-expanded={showRemoved}
                        >
                            {showRemoved ? "Nascondi" : "Mostra"} i {removed.length} drink
                            {removed.length === 1 ? " tolto dal bancone" : " tolti dal bancone"}
                        </button>

                        {showRemoved && (
                            <ul className="menu-list menu-list-muted">
                                {removed.map((drink) => (
                                    <li className="menu-item" key={drink.id}>
                                        <div className="menu-item-text">
                                            <Link to={`/drink/${drink.id}`} className="menu-item-name">
                                                {drink.name}
                                            </Link>
                                            <span className="menu-item-ingredients">
                                                {ingredientSummary(drink)}
                                            </span>
                                        </div>

                                        {isBar && (
                                            <button
                                                type="button"
                                                className="btn btn-outline btn-sm"
                                                onClick={() => onToggleRemoved(drink, false)}
                                                disabled={ordering === drink.id}
                                            >
                                                Rimetti sul bancone
                                            </button>
                                        )}
                                    </li>
                                ))}
                            </ul>
                        )}
                    </div>
                )}
            </div>
        </div>
    );
}

export default PartyMenu;
