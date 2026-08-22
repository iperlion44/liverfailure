import { useEffect, useState } from "react";

import { collection, getDocs, doc, getDoc, deleteDoc } from "firebase/firestore";

import { Link } from "react-router-dom";

import db from "../firebase/firestore";

import { useAuth } from "../context/AuthContext";
import {
    mergeFavorites,
    readCachedFavorites,
    removeFavoriteLocally,
    writeCachedFavorites
} from "../utils/favoritesStorage";

import DrinkCard from "../components/DrinkCard";
import EmptyState from "../components/EmptyState";
import { DrinkGridSkeleton } from "../components/Loader";

function Favorites() {
    const { user } = useAuth();

    const [favorites, setFavorites] = useState([]);
    const [loading, setLoading] = useState(true);
    const [isCached, setIsCached] = useState(false);

    useEffect(() => {
        const fetchFavorites = async () => {
            if (!user) {
                setFavorites([]);
                setLoading(false);
                return;
            }

            const cachedFavorites = readCachedFavorites(user.uid);

            if (cachedFavorites.length > 0) {
                setFavorites(cachedFavorites);
            }

            try {
                if (!navigator.onLine) {
                    throw new Error("Offline");
                }

                const favoritesSnapshot = await getDocs(
                    collection(db, "users", user.uid, "favorites")
                );

                const results = await Promise.all(
                    favoritesSnapshot.docs.map(async (favorite) => {
                        const drinkSnapshot = await getDoc(doc(db, "drinks", favorite.id));

                        if (!drinkSnapshot.exists()) {
                            return { id: favorite.id, drink: null };
                        }

                        const data = drinkSnapshot.data();
                        const isOwnerOfDrink = data.authorId === user.uid;

                        if (data.isPublic === false && !isOwnerOfDrink) {
                            return { id: favorite.id, drink: null };
                        }

                        return {
                            id: favorite.id,
                            drink: { id: drinkSnapshot.id, ...data }
                        };
                    })
                );

                const validDrinks = results.filter((result) => result.drink).map((result) => result.drink);

                // Drink eliminato o reso privato da chi non è l'autore, ma
                // il riferimento ai preferiti è rimasto: lo rimuoviamo da
                // Firestore e dalla cache locale.
                const staleIds = results.filter((result) => !result.drink).map((result) => result.id);

                if (staleIds.length > 0) {
                    await Promise.all(
                        staleIds.map((staleId) =>
                            deleteDoc(doc(db, "users", user.uid, "favorites", staleId)).catch((error) => {
                                console.error(error);
                            })
                        )
                    );

                    staleIds.forEach((staleId) => removeFavoriteLocally(user.uid, staleId));
                }

                const mergedFavorites = mergeFavorites(validDrinks, readCachedFavorites(user.uid));

                setFavorites(mergedFavorites);
                setIsCached(false);
                writeCachedFavorites(user.uid, mergedFavorites);
            } catch (error) {
                console.error(error);
                setFavorites(cachedFavorites);
                setIsCached(true);
            } finally {
                setLoading(false);
            }
        };

        fetchFavorites();
    }, [user]);

    return (
        <div className="shell page">
            <header className="page-head">
                <div className="page-head-text">
                    <span className="eyebrow">La tua selezione</span>
                    <h1 className="display display-l">Preferiti</h1>
                    <p className="lede">
                        I drink che hai messo da parte. Restano
                        leggibili anche senza connessione.
                    </p>
                </div>

                {!loading && favorites.length > 0 && (
                    <span className="count">
                        {favorites.length}
                        {favorites.length === 1 ? " salvato" : " salvati"}
                    </span>
                )}
            </header>

            {isCached && favorites.length > 0 && (
                <div className="notice">
                    Sei offline: stai leggendo la copia salvata sul
                    dispositivo. Si aggiorna appena torni online.
                </div>
            )}

            {loading && <DrinkGridSkeleton count={3} />}

            {!loading && favorites.length === 0 && (
                <EmptyState
                    eyebrow="Nessun preferito"
                    title="Non hai ancora salvato niente"
                    body="Apri un drink in Esplora e salvalo: lo ritrovi qui, anche senza connessione."
                >
                    <Link to="/explore" className="btn btn-primary">
                        Vai a Esplora
                    </Link>
                </EmptyState>
            )}

            {!loading && favorites.length > 0 && (
                <div className="drink-grid">
                    {favorites.map((drink) => (
                        <Link key={drink.id} to={`/drink/${drink.id}`}>
                            <DrinkCard drink={drink} />
                        </Link>
                    ))}
                </div>
            )}
        </div>
    );
}

export default Favorites;
