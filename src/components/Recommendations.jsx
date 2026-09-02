import { useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";

import { collection, getDocs, query, where } from "firebase/firestore";

import db from "../firebase/firestore";
import { fetchAllRatings } from "../firebase/reviews";
import { useAuth } from "../context/useAuth";
import { useInventory } from "../context/useInventory";
import { normalizeIngredients } from "../utils/drink";
import { matchDrink } from "../utils/inventoryMatch";
import { mergeFavorites, readCachedFavorites } from "../utils/favoritesStorage";
import { RECOMMENDATION_LIMIT, recommendDrinks } from "../utils/recommendations";
import { onIdle } from "../utils/idle";
import DrinkCard from "./DrinkCard";

function SharedIngredients({ shared }) {
    if (shared.length === 0) {
        return null;
    }

    return (
        <p className="recommendation-why">
            Come i tuoi preferiti: {shared.slice(0, 3).join(", ")}
        </p>
    );
}

// consigli calcolati qui sul telefono a partire dai preferiti: niente
// modelli, niente servizi esterni, solo gli ingredienti che ho già
// dimostrato di apprezzare
function Recommendations() {
    const { user } = useAuth();
    const { inventorySet } = useInventory();

    const [drinks, setDrinks] = useState([]);
    const [favorites, setFavorites] = useState([]);
    const [ratings, setRatings] = useState({});

    // resta false se la lettura non è andata a buon fine: senza la
    // libreria non ho niente da consigliare e la sezione non compare
    const [loaded, setLoaded] = useState(false);

    useEffect(() => {
        if (!user) {
            return undefined;
        }

        let cancelled = false;

        const load = async () => {
            try {
                if (!navigator.onLine) {
                    return;
                }

                const [drinksSnapshot, favoritesSnapshot, allRatings] = await Promise.all([
                    getDocs(query(collection(db, "drinks"), where("isPublic", "==", true))),
                    getDocs(collection(db, "users", user.uid, "favorites")),
                    fetchAllRatings()
                ]);

                if (cancelled) {
                    return;
                }

                const publicDrinks = drinksSnapshot.docs.map((document) => ({
                    id: document.id,
                    ...document.data(),
                    ingredients: normalizeIngredients(document.data().ingredients)
                }));

                const favoriteIds = new Set(favoritesSnapshot.docs.map((document) => document.id));

                // i preferiti li ricavo dalla libreria che ho appena
                // letto: mi servono gli ingredienti, non solo gli id, e
                // così non faccio una lettura per ogni preferito
                const remoteFavorites = publicDrinks.filter((drink) => favoriteIds.has(drink.id));

                setDrinks(publicDrinks);
                setFavorites(mergeFavorites(remoteFavorites, readCachedFavorites(user.uid)));
                setRatings(allRatings);
                setLoaded(true);
            } catch (error) {
                // i consigli sono un extra: se non arrivano, la home
                // resta quella di prima
                console.error(error);
            }
        };

        const cancelIdle = onIdle(load);

        return () => {
            cancelled = true;
            cancelIdle();
        };
    }, [user]);

    const suggestions = useMemo(
        () =>
            recommendDrinks({
                drinks,
                favorites,
                ratings,
                userId: user?.uid,
                limit: RECOMMENDATION_LIMIT
            }),
        [drinks, favorites, ratings, user]
    );

    if (!user || !loaded) {
        return null;
    }

    // niente preferiti, niente consigli: lo dico con l'empty state
    // invece di far sparire la sezione senza spiegazioni
    if (favorites.length === 0) {
        return (
            <section className="shell home-section">
                <header className="home-section-head">
                    <span className="eyebrow eyebrow-bitter">Consigliati per te</span>
                    <h2 className="home-section-title">Ancora non ti conosco</h2>
                </header>

                <p className="lede">
                    Salva qualche drink nei preferiti: da lì capisco cosa ti
                    piace bere e ti propongo ricette con gli stessi
                    ingredienti.
                </p>

                <div className="form-actions">
                    <Link to="/explore" className="btn btn-outline">
                        Vai a Esplora
                    </Link>
                </div>
            </section>
        );
    }

    if (suggestions.length === 0) {
        return null;
    }

    return (
        <section className="shell home-section">
            <header className="home-section-head">
                <div>
                    <span className="eyebrow eyebrow-bitter">Consigliati per te</span>
                    <h2 className="home-section-title">Somigliano ai tuoi preferiti</h2>
                </div>

                <Link to="/explore" className="btn btn-outline btn-sm">
                    Vedi tutti in Esplora
                </Link>
            </header>

            <div className="drink-grid">
                {suggestions.map(({ drink, shared }) => (
                    <Link to={`/drink/${drink.id}`} key={drink.id}>
                        <DrinkCard
                            drink={drink}
                            rating={ratings[drink.id]}
                            match={matchDrink(drink.ingredients, inventorySet)}
                        >
                            <SharedIngredients shared={shared} />
                        </DrinkCard>
                    </Link>
                ))}
            </div>
        </section>
    );
}

export default Recommendations;
