import { useEffect, useState } from "react";
import { Link } from "react-router-dom";

import { collection, deleteDoc, doc, getDocs, query, where } from "firebase/firestore";

import db from "../firebase/firestore";

import { useAuth } from "../context/useAuth";
import DrinkCard from "../components/DrinkCard";
import EmptyState from "../components/EmptyState";
import { DrinkGridSkeleton } from "../components/Loader";
import { removeFavoriteLocally } from "../utils/favoritesStorage";
import { readCachedMyDrinks, writeCachedMyDrinks } from "../utils/myDrinksStorage";

function MyDrinks() {
    const { user } = useAuth();

    const [drinks, setDrinks] = useState([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState("");
    const [isCached, setIsCached] = useState(false);

    const handleDelete = async (drinkId, drinkName) => {
        const confirmDelete = window.confirm(
            `Eliminare "${drinkName}"? La ricetta sparisce anche dalla libreria pubblica.`
        );

        if (!confirmDelete) {
            return;
        }

        try {
            await deleteDoc(doc(db, "drinks", drinkId));
            removeFavoriteLocally(user.uid, drinkId);

            deleteDoc(doc(db, "users", user.uid, "favorites", drinkId)).catch((error) => {
                console.error(error);
            });

            // tengo il salvataggio su localStorage fuori dal setDrinks,
            // in StrictMode gli updater vengono chiamati due volte e
            // non voglio scrivere doppio
            const nextDrinks = drinks.filter((drink) => drink.id !== drinkId);

            setDrinks(nextDrinks);
            writeCachedMyDrinks(user.uid, nextDrinks);
        } catch (error) {
            console.error(error);
            setError("Non è stato possibile eliminare il drink. Riprova.");
        }
    };

    useEffect(() => {
        let cancelled = false;

        const fetchMyDrinks = async () => {
            const cachedDrinks = readCachedMyDrinks(user.uid);

            if (cachedDrinks.length > 0) {
                setDrinks(cachedDrinks);
            }

            try {
                if (!navigator.onLine) {
                    throw new Error("Offline");
                }

                const drinksQuery = query(
                    collection(db, "drinks"),
                    where("authorId", "==", user.uid)
                );

                const querySnapshot = await getDocs(drinksQuery);

                if (cancelled) {
                    return;
                }

                const drinksList = querySnapshot.docs.map((document) => ({
                    id: document.id,
                    ...document.data()
                }));

                setDrinks(drinksList);
                setIsCached(false);
                writeCachedMyDrinks(user.uid, drinksList);
            } catch (error) {
                console.error(error);

                if (cancelled) {
                    return;
                }

                if (cachedDrinks.length > 0) {
                    setDrinks(cachedDrinks);
                    setIsCached(true);
                } else {
                    setError("Non è stato possibile caricare i tuoi drink. Controlla la connessione e riprova.");
                }
            } finally {
                if (!cancelled) {
                    setLoading(false);
                }
            }
        };

        fetchMyDrinks();

        return () => {
            cancelled = true;
        };
    }, [user]);

    const publicCount = drinks.filter((drink) => drink.isPublic).length;

    return (
        <div className="shell page">
            <header className="page-head">
                <div className="page-head-text">
                    <span className="eyebrow">La tua produzione</span>
                    <h1 className="display display-l">I miei drink</h1>
                    <p className="lede">
                        Le ricette che hai scritto tu. Solo quelle
                        pubbliche compaiono in Esplora.
                    </p>
                </div>

                {!loading && drinks.length > 0 && (
                    <span className="count">
                        {drinks.length} scritti · {publicCount} pubblici
                    </span>
                )}
            </header>

            {isCached && drinks.length > 0 && (
                <div className="notice">
                    Sei offline: stai leggendo la copia salvata sul
                    dispositivo. Si aggiorna appena torni online.
                </div>
            )}

            {error && (
                <div className="notice notice-error" role="alert">
                    {error}
                </div>
            )}

            {loading && <DrinkGridSkeleton count={3} />}

            {!loading && drinks.length === 0 && (
                <EmptyState
                    eyebrow="Nessuna ricetta"
                    title="Non hai ancora scritto niente"
                    body="Il primo drink si scrive in un minuto: nome, ingredienti, procedimento. Le dosi le decidi tu."
                >
                    <Link to="/create-drink" className="btn btn-primary">
                        Crea il tuo primo drink
                    </Link>
                    <Link to="/explore" className="btn btn-outline">
                        Guarda cosa fanno gli altri
                    </Link>
                </EmptyState>
            )}

            {!loading && drinks.length > 0 && (
                <div className="drink-grid">
                    {drinks.map((drink) => (
                        <DrinkCard drink={drink} showStatus key={drink.id}>
                            <div className="drink-card-actions">
                                <Link to={`/drink/${drink.id}`} className="btn btn-outline btn-sm">
                                    Apri
                                </Link>
                                <Link to={`/edit-drink/${drink.id}`} className="btn btn-outline btn-sm">
                                    Modifica
                                </Link>
                                <button
                                    type="button"
                                    className="btn btn-danger-quiet btn-sm"
                                    onClick={() => handleDelete(drink.id, drink.name)}
                                >
                                    Elimina
                                </button>
                            </div>
                        </DrinkCard>
                    ))}
                </div>
            )}
        </div>
    );
}

export default MyDrinks;
