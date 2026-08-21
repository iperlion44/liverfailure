import { useEffect, useState } from "react";
import { Link } from "react-router-dom";

import { collection, deleteDoc, doc, getDocs, query, where } from "firebase/firestore";

import db from "../firebase/firestore";

import { useAuth } from "../context/AuthContext";
import DrinkCard from "../components/DrinkCard";
import EmptyState from "../components/EmptyState";
import { DrinkGridSkeleton } from "../components/Loader";
import { removeFavoriteLocally } from "../utils/favoritesStorage";

function MyDrinks() {
    const { user } = useAuth();

    const [drinks, setDrinks] = useState([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState("");

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

            setDrinks((previousDrinks) => previousDrinks.filter((drink) => drink.id !== drinkId));
        } catch (error) {
            console.error(error);
            setError("Non è stato possibile eliminare il drink. Riprova.");
        }
    };

    useEffect(() => {
        const fetchMyDrinks = async () => {
            try {
                const drinksQuery = query(
                    collection(db, "drinks"),
                    where("authorId", "==", user.uid)
                );

                const querySnapshot = await getDocs(drinksQuery);
                const drinksList = querySnapshot.docs.map((doc) => ({
                    id: doc.id,
                    ...doc.data()
                }));

                setDrinks(drinksList);
            } catch (error) {
                console.error(error);
                setError("Non è stato possibile caricare i tuoi drink. Controlla la connessione e riprova.");
            } finally {
                setLoading(false);
            }
        };

        fetchMyDrinks();
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
