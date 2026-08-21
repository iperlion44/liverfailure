import { countIngredients } from "../utils/drink";

function DrinkCard({ drink, showStatus = false, children }) {
    const ingredientCount = countIngredients(drink.ingredients);

    return (
        <article className="drink-card">
            {drink.image && (
                <img className="drink-card-image" src={drink.image} alt="" loading="lazy" />
            )}

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
        </article>
    );
}

export default DrinkCard;
