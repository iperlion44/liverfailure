import { memo } from "react";

import { countIngredients } from "../utils/drink";
import { averageOf } from "../utils/rating";
import MatchBadge from "./MatchBadge";
import { StarRating } from "./StarRating";

// più / spunta per aggiungere o togliere il drink dalla lista della
// festa attiva, sopra la foto della card
function PartyMark({ active }) {
    return (
        <svg width="15" height="15" viewBox="0 0 16 16" fill="none" aria-hidden="true">
            {active ? (
                <path
                    d="M3 8.4 L6.4 11.8 L13 4.6"
                    stroke="currentColor"
                    strokeWidth="1.7"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                />
            ) : (
                <path d="M8 3 V13 M3 8 H13" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" />
            )}
        </svg>
    );
}

// stellina per salvare/togliere il drink dai preferiti al volo,
// stesso posto e stessa logica del pulsante della festa
function StarMark({ active }) {
    return (
        <svg width="16" height="16" viewBox="0 0 16 16" aria-hidden="true">
            <path
                d="M8 1.6 L9.9 5.9 L14.5 6.4 L11 9.5 L12 14 L8 11.7 L4 14 L5 9.5 L1.5 6.4 L6.1 5.9 Z"
                fill={active ? "currentColor" : "none"}
                stroke="currentColor"
                strokeWidth={active ? "0" : "1.3"}
                strokeLinejoin="round"
            />
        </svg>
    );
}

// icona al posto della foto quando il drink non ne ha una
function GlassMark() {
    return (
        <svg width="30" height="30" viewBox="0 0 30 30" fill="none" aria-hidden="true">
            <path
                d="M8 5.5 H22 L15.9 15 V23.5 M15.9 15 L9 5.5"
                stroke="currentColor"
                strokeWidth="1.3"
                strokeLinecap="round"
                strokeLinejoin="round"
            />
            <path d="M11.5 24.5 H20.3" stroke="currentColor" strokeWidth="1.3" strokeLinecap="round" />
        </svg>
    );
}

function DrinkCard({
    drink,
    showStatus = false,
    rating = null,
    match = null,
    partyAction = null,
    favoriteAction = null,
    children
}) {
    const ingredientCount = countIngredients(drink.ingredients);
    const hasRating = Boolean(rating && rating.ratingCount > 0);

    return (
        <article className="drink-card">
            {(partyAction || favoriteAction) && (
                <div className="card-quick-actions">
                    {favoriteAction && (
                        <button
                            type="button"
                            className={favoriteAction.active ? "card-icon-btn is-active" : "card-icon-btn"}
                            aria-pressed={favoriteAction.active}
                            disabled={favoriteAction.pending}
                            title={favoriteAction.active ? "Rimuovi dai preferiti" : "Aggiungi ai preferiti"}
                            onClick={(event) => {
                                // la card è spesso dentro un <Link>: senza fermare
                                // l'evento qui il click aprirebbe anche il dettaglio
                                event.preventDefault();
                                event.stopPropagation();
                                favoriteAction.onToggle();
                            }}
                        >
                            <StarMark active={favoriteAction.active} />
                        </button>
                    )}

                    {partyAction && (
                        <button
                            type="button"
                            className={partyAction.active ? "card-icon-btn is-active" : "card-icon-btn"}
                            aria-haspopup="dialog"
                            title={partyAction.active ? "Già in una festa aperta — gestisci" : "Aggiungi a una festa"}
                            onClick={(event) => {
                                // la card è spesso dentro un <Link>: senza fermare
                                // l'evento qui il click aprirebbe anche il dettaglio
                                event.preventDefault();
                                event.stopPropagation();
                                partyAction.onOpen();
                            }}
                        >
                            <PartyMark active={partyAction.active} />
                        </button>
                    )}
                </div>
            )}

            <div className="drink-card-body">
                <h2 className="drink-card-name">{drink.name || "Senza nome"}</h2>

                {drink.description && (
                    <p className="drink-card-desc">{drink.description}</p>
                )}

                <MatchBadge match={match} />

                <div className="drink-card-meta">
                    {showStatus ? (
                        <span className={drink.isPublic ? "status status-public" : "status"}>
                            <span className="status-dot" />
                            {drink.isPublic ? "Pubblico" : "Privato"}
                        </span>
                    ) : (
                        drink.authorName && <span>{drink.authorName}</span>
                    )}

                    {ingredientCount > 0 && (
                        <>
                            <span className="drink-card-meta-sep" />
                            <span>
                                {ingredientCount}
                                {ingredientCount === 1 ? " ingrediente" : " ingredienti"}
                            </span>
                        </>
                    )}

                    {hasRating && (
                        <>
                            <span className="drink-card-meta-sep" />
                            <StarRating
                                value={averageOf(rating)}
                                showValue
                                count={rating.ratingCount}
                            />
                        </>
                    )}
                </div>

                {children}
            </div>

            <div className="drink-card-photo">
                {drink.image ? (
                    <img
                        className="drink-card-image"
                        src={drink.image}
                        alt=""
                        loading="lazy"
                        decoding="async"
                    />
                ) : (
                    <div className="drink-card-photo-empty">
                        <GlassMark />
                    </div>
                )}
            </div>
        </article>
    );
}

// le foto sono data URL grosse dentro alla prop drink, quindi senza
// memo ogni carattere digitato nella ricerca fa ricontrollare tutte
// quelle stringhe. gli oggetti drink non cambiano riferimento se non
// cambiano davvero, quindi il memo funziona bene qui
export default memo(DrinkCard);
