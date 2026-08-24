import { memo } from "react";

import { countIngredients } from "../utils/drink";

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

function DrinkCard({ drink, showStatus = false, children }) {
    const ingredientCount = countIngredients(drink.ingredients);

    return (
        <article className="drink-card">
            <div className="drink-card-body">
                <h2 className="drink-card-name">{drink.name || "Senza nome"}</h2>

                {drink.description && (
                    <p className="drink-card-desc">{drink.description}</p>
                )}

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
