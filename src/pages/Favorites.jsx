import { useEffect, useState } from "react";

import { collection, getDocs, doc, getDoc, deleteDoc } from "firebase/firestore";

import { Link } from "react-router-dom";

import db from "../firebase/firestore";

import { useAuth } from "../context/useAuth";
import { useInventory } from "../context/useInventory";
import { matchDrink } from "../utils/inventoryMatch";
import {
    mergeFavorites,
    readCachedFavorites,
    removeFavoriteLocally,
    writeCachedFavorites
} from "../utils/favoritesStorage";
import { usePartyPicker } from "../utils/usePartyPicker";

import DrinkCard from "../components/DrinkCard";
import EmptyState from "../components/EmptyState";
import PartyPickerModal from "../components/PartyPickerModal";
import { DrinkGridSkeleton } from "../components/Loader";
import { IconSearch } from "../components/NavIcons";

function Favorites() {
    const { user } = useAuth();
    const { inventorySet } = useInventory();
    const party = usePartyPicker();

    const [favorites, setFavorites] = useState([]);
    const [loading, setLoading] = useState(true);
    const [isCached, setIsCached] = useState(false);
    const [removingId, setRemovingId] = useState(null);

    // qui la stellina è sempre "piena": cliccarla toglie il drink dai
    // preferiti e lo fa sparire subito dalla griglia
    const handleRemoveFavorite = async (drink) => {
        if (!user) {
            return;
        }

        setRemovingId(drink.id);
        removeFavoriteLocally(user.uid, drink.id);

        const nextFavorites = favorites.filter((favorite) => favorite.id !== drink.id);

        setFavorites(nextFavorites);
        writeCachedFavorites(user.uid, nextFavorites);

        try {
            if (!navigator.onLine) {
                throw new Error("Offline");
            }

            await deleteDoc(doc(db, "users", user.uid, "favorites", drink.id));
        } catch (error) {
            // offline o errore di rete: la rimozione resta comunque sul
            // dispositivo e si sincronizza appena torna la connessione
            console.error(error);
        } finally {
            setRemovingId(null);
        }
    };

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

                // se il drink è stato cancellato o messo privato da chi
                // non è l'autore, il riferimento nei preferiti resta
                // "orfano": lo tolgo sia da firestore che dalla cache
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
                    <h1 className="display display-l">Preferiti</h1>
                </div>

                {!loading && favorites.length > 0 && (
                    <span className="count">
                        {favorites.length}
                        {favorites.length === 1 ? " salvato" : " salvati"}
                    </span>
                )}
            </header>

            {party.partyNotice && (
                <div className="notice" role="status">
                    {party.partyNotice.text} <Link to={`/party/${party.partyNotice.code}`}>Vai alla festa</Link>.
                </div>
            )}

            {isCached && favorites.length > 0 && (
                <div className="notice">
                    Sei offline: stai leggendo la copia salvata sul
                    dispositivo. Si aggiorna appena torni online.
                </div>
            )}

            {loading && <DrinkGridSkeleton count={3} />}

            {!loading && favorites.length === 0 && (
                <EmptyState title="Non hai ancora salvato niente">
                    <Link to="/explore" className="btn btn-primary btn-hero">
                        <IconSearch />
                        Vai a Esplora
                    </Link>
                </EmptyState>
            )}

            {!loading && favorites.length > 0 && (
                <div className="drink-grid">
                    {favorites.map((drink) => (
                        <Link key={drink.id} to={`/drink/${drink.id}`}>
                            <DrinkCard
                                drink={drink}
                                match={matchDrink(drink.ingredients, inventorySet)}
                                partyAction={party.partyActionFor(drink, user)}
                                favoriteAction={{
                                    active: true,
                                    pending: removingId === drink.id,
                                    onToggle: () => handleRemoveFavorite(drink)
                                }}
                            />
                        </Link>
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

export default Favorites;
