import { Fragment, useMemo } from "react";
import { Link } from "react-router-dom";

import { buildMenuShoppingList, combinedPantry } from "../utils/partyPlanning";
import { normalizeIngredients } from "../utils/drink";
import EmptyState from "./EmptyState";
import { IconCheck, IconPlus } from "./NavIcons";

// stessa riga di sempre ("Gin · Vermut · ..."), ma con gli ingredienti
// che non sono in dispensa/bancone evidenziati in rosso, cosi' a colpo
// d'occhio si vede cosa manca senza dover aprire la spesa qui sotto
function IngredientSummary({ drink, owned }) {
    const ingredients = normalizeIngredients(drink.ingredients);

    return (
        <span className="menu-item-ingredients">
            {ingredients.map((ingredient, index) => (
                <Fragment key={`${ingredient.name}-${index}`}>
                    {index > 0 && " · "}
                    <span className={owned.has(ingredient.name) ? undefined : "ingredient-missing"}>
                        {ingredient.name}
                    </span>
                </Fragment>
            ))}
        </span>
    );
}

// la fase di preparazione: i drink si scelgono da Esplora o dai propri
// (come i preferiti, ma per la festa; anche i privati, che alla festa
// diventano visibili a tutti), qui si vede la lista già salvata, cosa
// manca rispetto alla propria dispensa, e si avvia la festa quando è
// pronta. Resta utile anche a festa già iniziata, per togliere un drink
// al volo o tenere d'occhio la lista della spesa
function PartyPlanner({
    catalog,
    selectedIds,
    pantry,
    partyInventory,
    togglingId = "",
    onRemove
}) {
    const selectedSet = useMemo(() => new Set(selectedIds), [selectedIds]);
    const selectedDrinks = useMemo(
        () => catalog.filter((drink) => selectedSet.has(drink.id)),
        [catalog, selectedSet]
    );

    // in menuDrinkIds può restare l'id di un drink pubblicato e poi
    // tolto dalla libreria: non lo trovo più nel catalogo, ma è giusto
    // segnalarlo invece di farlo sparire in silenzio
    const missingFromCatalog = selectedIds.length - selectedDrinks.length;

    const owned = useMemo(() => combinedPantry(pantry, partyInventory), [pantry, partyInventory]);

    const { have, missing } = useMemo(
        () => buildMenuShoppingList(selectedDrinks, owned),
        [selectedDrinks, owned]
    );

    return (
        <div className="party-planner">
            <section>
                <div className="shopping-head">
                    <h2 className="recipe-block-title">La lista della festa</h2>

                    {selectedDrinks.length > 0 && (
                        <div className="party-planner-add">
                            <Link to="/explore" className="btn btn-primary">
                                <IconPlus />
                                Aggiungi drink
                            </Link>

                            <Link to="/my-drinks" className="btn btn-outline">
                                Dai miei drink
                            </Link>
                        </div>
                    )}
                </div>

                {selectedDrinks.length === 0 ? (
                    <EmptyState title="Non hai ancora scelto un drink">
                        <Link to="/explore" className="btn btn-primary btn-hero">
                            <IconPlus />
                            Scegli da Esplora
                        </Link>

                        {/* anche una ricetta privata si può mettere nel
                            menù: alla festa la vedono tutti, in Esplora
                            resta invisibile come prima */}
                        <Link to="/my-drinks" className="btn btn-outline">
                            Oppure metti un tuo drink
                        </Link>
                    </EmptyState>
                ) : (
                    <ul className="menu-list party-planner-list">
                        {selectedDrinks.map((drink) => (
                            <li className="menu-item" key={drink.id}>
                                <div className="menu-item-text">
                                    <Link to={`/drink/${drink.id}`} className="menu-item-name">
                                        {drink.name}
                                    </Link>
                                    <IngredientSummary drink={drink} owned={owned} />
                                </div>

                                <button
                                    type="button"
                                    className="btn btn-outline btn-sm"
                                    disabled={togglingId === drink.id}
                                    onClick={() => onRemove(drink)}
                                >
                                    {togglingId === drink.id ? "Elimino..." : "Elimina"}
                                </button>
                            </li>
                        ))}

                        {missingFromCatalog > 0 && (
                            <li className="menu-item">
                                <span className="menu-item-text">
                                    {missingFromCatalog === 1
                                        ? "1 drink della lista non è più disponibile."
                                        : `${missingFromCatalog} drink della lista non sono più disponibili.`}
                                </span>
                            </li>
                        )}
                    </ul>
                )}
            </section>

            {selectedDrinks.length > 0 && (
                <section className="shopping">
                    <div className="shopping-head">
                        <span className="field-label">Ingredienti per il menù</span>
                    </div>

                    {missing.length === 0 ? (
                        <p className="pantry-verdict">Hai già tutto quello che serve per questi drink.</p>
                    ) : (
                        <>
                            <p className="pantry-verdict">
                                {missing.length === 1
                                    ? "Ti manca un ingrediente."
                                    : `Ti mancano ${missing.length} ingredienti.`}
                            </p>

                            <ul className="shopping-list">
                                {missing.map((item) => (
                                    <li key={item.name}>
                                        <span>{item.name}</span>
                                        <span className="ingredient-qty">{item.quantity || "q.b."}</span>
                                    </li>
                                ))}
                            </ul>
                        </>
                    )}

                    {have.length > 0 && (
                        <>
                            <div className="shopping-head shopping-head-have">
                                <span className="field-label">Ce l'hai già</span>
                            </div>

                            <ul className="checklist">
                                {have.map((item) => (
                                    <li className="checklist-item is-owned" key={item.name}>
                                        <span className="checklist-mark is-owned" aria-hidden="true">
                                            <IconCheck />
                                        </span>
                                        <span>{item.name}</span>
                                        {item.quantity && <span className="ingredient-qty">{item.quantity}</span>}
                                    </li>
                                ))}
                            </ul>
                        </>
                    )}
                </section>
            )}
        </div>
    );
}

export default PartyPlanner;
