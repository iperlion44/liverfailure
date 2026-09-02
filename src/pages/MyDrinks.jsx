import { useEffect, useState } from "react";
import { Link } from "react-router-dom";

import { collection, deleteDoc, doc, getDocs, query, where } from "firebase/firestore";

import db from "../firebase/firestore";

import { useAuth } from "../context/useAuth";
import { useInventory } from "../context/useInventory";
import { matchDrink } from "../utils/inventoryMatch";
import DrinkCard from "../components/DrinkCard";
import EmptyState from "../components/EmptyState";
import PartyPickerModal from "../components/PartyPickerModal";
import { DrinkGridSkeleton } from "../components/Loader";
import { IconPlus } from "../components/NavIcons";
import { removeFavoriteLocally } from "../utils/favoritesStorage";
import { readCachedMyDrinks, writeCachedMyDrinks } from "../utils/myDrinksStorage";
import { useFavoriteToggle } from "../utils/useFavoriteToggle";
import { usePartyPicker } from "../utils/usePartyPicker";

function MyDrinks() {
    const { user } = useAuth();
    const { inventorySet } = useInventory();
    const party = usePartyPicker();
    const { favoriteActionFor } = useFavoriteToggle(user);

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
                    <h1 className="display display-l">I miei drink</h1>
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

            {party.partyNotice && (
                <div className="notice" role="status">
                    {party.partyNotice.text} <Link to={`/party/${party.partyNotice.code}`}>Vai alla festa</Link>.
                </div>
            )}

            {loading && <DrinkGridSkeleton count={3} />}

            {!loading && drinks.length === 0 && (
                <EmptyState title="Non hai ancora scritto niente">
                    <Link to="/create-drink" className="btn btn-primary btn-hero">
                        <IconPlus />
                        Crea il tuo primo drink
                    </Link>
                    <Link to="/explore" className="btn btn-outline">
                        Guarda gli altri
                    </Link>
                </EmptyState>
            )}

            {!loading && drinks.length > 0 && (
                <div className="drink-grid">
                    {drinks.map((drink) => (
                        <DrinkCard
                            drink={drink}
                            showStatus
                            match={matchDrink(drink.ingredients, inventorySet)}
                            partyAction={party.partyActionFor(drink, user)}
                            favoriteAction={favoriteActionFor(drink)}
                            key={drink.id}
                        >
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

            {party.pickerDrink && (
                <PartyPickerModal
                    drink={party.pickerDrink}
                    parties={party.openParties}
                    pendingPartyId={party.pendingPartyId}
                    creating={party.creatingParty}
                    error={party.partyListError}
                    onToggleParty={party.handleToggleParty}
                    onCreateParty={party.handleCreateParty}
                    onClose={() => party.setPickerDrink(null)}
                />
            )}
        </div>
    );
}

export default MyDrinks;
