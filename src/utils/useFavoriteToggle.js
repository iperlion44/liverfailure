import { useState } from "react";

import { deleteDoc, doc, setDoc } from "firebase/firestore";

import db from "../firebase/firestore";
import {
    readCachedFavorites,
    removeFavoriteLocally,
    saveFavoriteLocally,
    writeCachedFavorites
} from "./favoritesStorage";
import { showNotification } from "./notifications";

// stessa logica di salvataggio/rimozione della pagina di dettaglio, ma
// pensata per una griglia: tiene lo stato di più drink alla volta e
// aggiorna subito la stellina senza aspettare firestore
export function useFavoriteToggle(user) {
    const [favoriteIds, setFavoriteIds] = useState(() =>
        user ? new Set(readCachedFavorites(user.uid).map((favorite) => favorite.id)) : new Set()
    );
    const [favoriteUserId, setFavoriteUserId] = useState(user?.uid ?? null);
    const [pendingFavoriteId, setPendingFavoriteId] = useState(null);

    // niente useEffect: se l'utente loggato cambia lo noto durante il
    // render e risincronizzo i preferiti dalla cache di quell'utente
    if ((user?.uid ?? null) !== favoriteUserId) {
        setFavoriteUserId(user?.uid ?? null);
        setFavoriteIds(user ? new Set(readCachedFavorites(user.uid).map((favorite) => favorite.id)) : new Set());
    }

    const toggleFavorite = async (drink) => {
        if (!user) {
            return;
        }

        const isFavorite = favoriteIds.has(drink.id);

        setPendingFavoriteId(drink.id);
        setFavoriteIds((previous) => {
            const next = new Set(previous);

            if (isFavorite) {
                next.delete(drink.id);
            } else {
                next.add(drink.id);
            }

            return next;
        });

        try {
            if (isFavorite) {
                removeFavoriteLocally(user.uid, drink.id);

                if (!navigator.onLine) {
                    throw new Error("Offline");
                }

                await deleteDoc(doc(db, "users", user.uid, "favorites", drink.id));
            } else {
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
            }
        } catch (error) {
            // offline o errore di rete: la modifica resta comunque sul
            // dispositivo e si sincronizza appena torna la connessione
            console.error(error);
        } finally {
            setPendingFavoriteId(null);
        }
    };

    const favoriteActionFor = (drink) =>
        user
            ? {
                  active: favoriteIds.has(drink.id),
                  pending: pendingFavoriteId === drink.id,
                  onToggle: () => toggleFavorite(drink)
              }
            : null;

    return { favoriteActionFor };
}
