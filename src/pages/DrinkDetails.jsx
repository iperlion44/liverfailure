import { useEffect, useMemo, useState } from "react";

import { deleteDoc, doc, getDoc, setDoc } from "firebase/firestore";

import { Link, useParams } from "react-router-dom";

import db from "../firebase/firestore";

import { useAuth } from "../context/AuthContext";
import {
    readCachedFavorites,
    removeFavoriteLocally,
    saveFavoriteLocally,
    writeCachedFavorites
} from "../utils/favoritesStorage";
import { readCachedMyDrinks } from "../utils/myDrinksStorage";
import { showNotification } from "../utils/notifications";

import { normalizeIngredients } from "../utils/drink";
import { isAlcoholic, isExtra } from "../utils/spirits";
import { Loader } from "../components/Loader";
import EmptyState from "../components/EmptyState";

function FavMark({ draw = false }) {
    return (
        <span className={draw ? "fav-mark fav-mark-draw" : "fav-mark"} aria-hidden="true">
            <svg width="13" height="13" viewBox="0 0 14 14" fill="none">
                <path
                    className="fav-mark-path"
                    d="M2.5 7.2 L5.6 10.3 L11.5 3.8"
                    stroke="currentColor"
                    strokeWidth="1.6"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                />
            </svg>
        </span>
    );
}

function DrinkDetails() {
    const { id } = useParams();

    const [drink, setDrink] = useState(null);
    const [loading, setLoading] = useState(true);

    // Scavalca la copia in cache appena l'utente tocca il bottone, così
    // l'interfaccia risponde subito senza rileggere localStorage.
    const [override, setOverride] = useState(null);

    const [notice, setNotice] = useState("");

    // Fa disegnare il segno di conferma solo al click, mai al caricamento.
    const [justSaved, setJustSaved] = useState(false);

    const [isCached, setIsCached] = useState(false);

    const { user } = useAuth();

    useEffect(() => {
        const cachedDrink = user
            ? readCachedFavorites(user.uid).find((favorite) => favorite.id === id) ??
              readCachedMyDrinks(user.uid).find((myDrink) => myDrink.id === id)
            : null;

        const fetchDrink = async () => {
            try {
                if (!navigator.onLine) {
                    throw new Error("Offline");
                }

                const snapshot = await getDoc(doc(db, "drinks", id));

                if (snapshot.exists()) {
                    const data = snapshot.data();
                    const isOwnerOfDrink = user && data.authorId === user.uid;

                    if (data.isPublic !== false || isOwnerOfDrink) {
                        setDrink({ id: snapshot.id, ...data });
                        setIsCached(false);
                    }
                }
            } catch (error) {
                console.error(error);

                // Offline e senza il documento fresco: se il drink è tra i
                // preferiti o tra i drink creati dall'utente e salvati
                // localmente, mostriamo comunque quella copia invece della
                // schermata "non esiste".
                if (cachedDrink) {
                    setDrink(cachedDrink);
                    setIsCached(true);
                }
            } finally {
                setLoading(false);
            }
        };

        fetchDrink();
    }, [id, user]);

    const isSaved = useMemo(() => {
        if (override && override.id === id) {
            return override.value;
        }

        if (!user) {
            return false;
        }

        return readCachedFavorites(user.uid).some((favorite) => favorite.id === id);
    }, [user, id, override]);

    const handleFavorite = async () => {
        if (!user || !drink) {
            return;
        }

        const favoriteDrink = {
            id: drink.id,
            name: drink.name,
            description: drink.description,
            ingredients: drink.ingredients,
            preparation: drink.preparation,
            authorName: drink.authorName,
            image: drink.image || ""
        };

        saveFavoriteLocally(user.uid, favoriteDrink);
        setOverride({ id: drink.id, value: true });
        setNotice("");
        setJustSaved(true);

        try {
            if (!navigator.onLine) {
                throw new Error("Offline");
            }

            await setDoc(doc(db, "users", user.uid, "favorites", drink.id), {
                drinkId: drink.id,
                savedAt: new Date()
            });

            showNotification("Preferiti", `${drink.name} è stato aggiunto ai preferiti.`);

            const currentFavorites = readCachedFavorites(user.uid);
            const nextFavorites = currentFavorites.some((favorite) => favorite.id === drink.id)
                ? currentFavorites
                : [...currentFavorites, favoriteDrink];

            writeCachedFavorites(user.uid, nextFavorites);
        } catch (error) {
            console.error(error);
            setNotice("Sei offline: il drink è salvato sul dispositivo e si sincronizza appena torni online.");
        }
    };

    const handleRemoveFavorite = async () => {
        if (!user || !drink) {
            return;
        }

        removeFavoriteLocally(user.uid, drink.id);
        setOverride({ id: drink.id, value: false });
        setNotice("");
        setJustSaved(false);

        try {
            if (!navigator.onLine) {
                throw new Error("Offline");
            }

            await deleteDoc(doc(db, "users", user.uid, "favorites", drink.id));
        } catch (error) {
            console.error(error);
            setNotice("Sei offline: la rimozione si sincronizza appena torni online.");
        }
    };

    if (loading) {
        return <Loader label="Apro la ricetta" />;
    }

    if (!drink) {
        return (
            <div className="shell page">
                <EmptyState
                    eyebrow="Ricetta assente"
                    title="Questo drink non esiste"
                    body="Il link potrebbe essere vecchio, oppure chi lo ha scritto lo ha eliminato."
                >
                    <Link to="/explore" className="btn btn-primary">
                        Torna a Esplora
                    </Link>
                </EmptyState>
            </div>
        );
    }

    const ingredients = normalizeIngredients(drink.ingredients);
    const alcoholicIngredients = ingredients.filter((ingredient) => isAlcoholic(ingredient.name));
    const extraIngredients = ingredients.filter(
        (ingredient) => !isAlcoholic(ingredient.name) && isExtra(ingredient.name)
    );
    const nonAlcoholicIngredients = ingredients.filter(
        (ingredient) => !isAlcoholic(ingredient.name) && !isExtra(ingredient.name)
    );

    const isOwner = user && drink.authorId === user.uid;

    return (
        <div className="shell-narrow detail">
            <Link to="/explore" className="back-link">
                <span aria-hidden="true">&larr;</span>
                Tutti i drink
            </Link>

            {drink.image && (
                <img className="detail-image" src={drink.image} alt={drink.name || ""} />
            )}

            <article className="detail-label">
                <span className="detail-mark" />
                <h1 className="display display-l detail-title">{drink.name}</h1>
                <p className="detail-author">Creato da {drink.authorName || "Sconosciuto"}</p>
                {drink.description && <p className="detail-desc">{drink.description}</p>}
            </article>

            {isCached && (
                <div className="notice">
                    Sei offline: stai leggendo la copia salvata sul
                    dispositivo. Si aggiorna appena torni online.
                </div>
            )}

            <div className="recipe">
                <section>
                    <span className="eyebrow eyebrow-bitter">Ti serve</span>
                    <h2 className="recipe-block-title">Ingredienti</h2>

                    {ingredients.length > 0 ? (
                        <>
                            {alcoholicIngredients.length > 0 && (
                                <div className="ingredient-section">
                                    <span className="ingredient-section-title">Alcolici</span>
                                    <ul className="ingredient-list">
                                        {alcoholicIngredients.map((ingredient, index) => (
                                            <li key={`${ingredient.name}-${index}`}>
                                                <span className="ingredient-index">
                                                    {String(index + 1).padStart(2, "0")}
                                                </span>
                                                <span>
                                                    {ingredient.name}
                                                    {ingredient.quantity && (
                                                        <span className="ingredient-qty">
                                                            {" — " + ingredient.quantity}
                                                        </span>
                                                    )}
                                                </span>
                                            </li>
                                        ))}
                                    </ul>
                                </div>
                            )}

                            {nonAlcoholicIngredients.length > 0 && (
                                <div className="ingredient-section">
                                    <span className="ingredient-section-title">Analcolici</span>
                                    <ul className="ingredient-list">
                                        {nonAlcoholicIngredients.map((ingredient, index) => (
                                            <li key={`${ingredient.name}-${index}`}>
                                                <span className="ingredient-index">
                                                    {String(index + 1).padStart(2, "0")}
                                                </span>
                                                <span>
                                                    {ingredient.name}
                                                    {ingredient.quantity && (
                                                        <span className="ingredient-qty">
                                                            {" — " + ingredient.quantity}
                                                        </span>
                                                    )}
                                                </span>
                                            </li>
                                        ))}
                                    </ul>
                                </div>
                            )}

                            {extraIngredients.length > 0 && (
                                <div className="ingredient-section">
                                    <span className="ingredient-section-title">Extra</span>
                                    <ul className="ingredient-list">
                                        {extraIngredients.map((ingredient, index) => (
                                            <li key={`${ingredient.name}-${index}`}>
                                                <span className="ingredient-index">
                                                    {String(index + 1).padStart(2, "0")}
                                                </span>
                                                <span>
                                                    {ingredient.name}
                                                    {ingredient.quantity && (
                                                        <span className="ingredient-qty">
                                                            {" — " + ingredient.quantity}
                                                        </span>
                                                    )}
                                                </span>
                                            </li>
                                        ))}
                                    </ul>
                                </div>
                            )}
                        </>
                    ) : (
                        <p className="recipe-text">
                            Chi ha scritto la ricetta non ha elencato
                            gli ingredienti.
                        </p>
                    )}
                </section>

                <section>
                    <span className="eyebrow eyebrow-bitter">Come si fa</span>
                    <h2 className="recipe-block-title">Preparazione</h2>
                    <p className="recipe-text">
                        {drink.preparation || "Nessun procedimento indicato."}
                    </p>
                </section>
            </div>

            {notice && (
                <div className="notice" style={{ marginTop: "2rem" }}>
                    {notice}
                </div>
            )}

            <div className="detail-actions">
                {user ? (
                    <button
                        type="button"
                        className={
                            isSaved
                                ? `btn btn-outline btn-fav is-saved${justSaved ? " btn-fav-settle" : ""}`
                                : "btn btn-outline btn-fav"
                        }
                        onClick={isSaved ? handleRemoveFavorite : handleFavorite}
                        onAnimationEnd={(event) => {
                            if (event.animationName === "fav-settle") {
                                setJustSaved(false);
                            }
                        }}
                    >
                        {isSaved && <FavMark draw={justSaved} />}
                        {isSaved ? "Rimuovi dai preferiti" : "Salva nei preferiti"}
                    </button>
                ) : (
                    <Link to="/login" className="btn btn-outline">
                        Accedi per salvarlo
                    </Link>
                )}

                {isOwner && (
                    <Link to={`/edit-drink/${drink.id}`} className="btn btn-primary">
                        Modifica la ricetta
                    </Link>
                )}
            </div>
        </div>
    );
}

export default DrinkDetails;
