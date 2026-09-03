import { useCallback, useEffect, useMemo, useState } from "react";

import {
    PARTY_NAME_MAX_LENGTH,
    createParty,
    listMyParties,
    setDrinkPartyCodes,
    setPartyMenu,
    subscribeQueuedOrders,
    syncPartyInventoryFromPantry
} from "../firebase/party";
import { useAuth } from "./useAuth";
import { PartyListContext } from "./usePartyList";

// le feste "aperte" sono quelle non ancora chiuse dall'host: sono le
// uniche su cui ha senso proporre di aggiungere un drink da Esplora.
// L'utente sceglie ogni volta a quale festa aggiungerlo (o ne apre una
// nuova al volo), quindi qui non serve più una "festa attiva" singola
export function PartyListProvider({ children }) {
    const { user, loading: authLoading } = useAuth();

    const [parties, setParties] = useState([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState("");
    const [pendingPartyId, setPendingPartyId] = useState("");
    const [creatingParty, setCreatingParty] = useState(false);

    // il caricamento al montaggio/cambio utente sta in un effetto a
    // parte (funzione locale, come fa InventoryProvider): "refresh" qui
    // sotto è la stessa logica ma richiamabile da fuori, dopo un'azione
    // dell'utente su Party o PartyRoom
    useEffect(() => {
        if (authLoading || !user) {
            return undefined;
        }

        let cancelled = false;

        const load = async () => {
            setLoading(true);

            try {
                const list = await listMyParties(user.uid);

                if (!cancelled) {
                    setParties(list);
                }
            } catch (fetchError) {
                console.error(fetchError);
            } finally {
                if (!cancelled) {
                    setLoading(false);
                }
            }
        };

        load();

        return () => {
            cancelled = true;
        };
    }, [authLoading, user]);

    const refresh = useCallback(() => {
        if (!user) {
            return;
        }

        setLoading(true);

        listMyParties(user.uid)
            .then((list) => setParties(list))
            .catch((fetchError) => console.error(fetchError))
            .finally(() => setLoading(false));
    }, [user]);

    const openParties = useMemo(
        () => (user ? parties.filter((party) => party.active !== false) : []),
        [parties, user]
    );

    // ordini in coda nelle mie feste aperte: un listener per festa, così
    // il bottone in navbar sa subito quando arriva qualcosa da preparare,
    // anche se non sono dentro la pagina della festa
    const [queuedByParty, setQueuedByParty] = useState({});

    useEffect(() => {
        if (!user || openParties.length === 0) {
            return undefined;
        }

        const unsubscribes = openParties.map((party) =>
            subscribeQueuedOrders(
                party.id,
                (orders) => setQueuedByParty((current) => ({ ...current, [party.id]: orders })),
                (fetchError) => console.error(fetchError)
            )
        );

        return () => unsubscribes.forEach((unsubscribe) => unsubscribe());
    }, [user, openParties]);

    // una voce per ogni festa con almeno un ordine in coda, più vecchia
    // per prima: se ne ho più di una il bottone in navbar deve far
    // scegliere quale, non indovinare al posto mio
    const queuedOrderParties = useMemo(() => {
        return openParties
            .map((party) => {
                const orders = queuedByParty[party.id];

                if (!orders || orders.length === 0) {
                    return null;
                }

                const oldest = orders.reduce((earliest, order) => {
                    const time = order.createdAt?.toMillis ? order.createdAt.toMillis() : 0;

                    return time < earliest ? time : earliest;
                }, Infinity);

                return { partyId: party.id, partyName: party.name, count: orders.length, oldest };
            })
            .filter(Boolean)
            .sort((first, second) => first.oldest - second.oldest);
    }, [openParties, queuedByParty]);

    const queuedOrdersCount = useMemo(
        () => queuedOrderParties.reduce((total, party) => total + party.count, 0),
        [queuedOrderParties]
    );

    // un drink privato lo vedo solo io: perché lo veda anche chi è alla
    // festa, sul suo documento scrivo i codici delle feste aperte che ce
    // l'hanno nel menù. Ricalcolo sempre la lista intera invece di
    // aggiungere e togliere un codice alla volta, così le feste chiuse o
    // cancellate escono da sole senza doverci pensare.
    // Vale solo per i miei drink privati: quelli pubblici li leggono già
    // tutti, e sul drink di un altro non ho il permesso di scrivere
    const syncDrinkParties = useCallback(
        async ({ drink, partyId, included }) => {
            if (!user || !drink?.id || drink.isPublic !== false || drink.authorId !== user.uid) {
                return;
            }

            const others = parties
                .filter((party) => party.id !== partyId && party.active !== false)
                .filter((party) => Array.isArray(party.menuDrinkIds) && party.menuDrinkIds.includes(drink.id))
                .map((party) => party.id);

            // la festa che sto toccando va in testa: se i codici sono più
            // di quanti ne accettano le regole, la lista viene tagliata in
            // fondo e quella appena scelta non deve essere la prima a saltare
            const codes = included ? [partyId, ...others] : others;

            try {
                await setDrinkPartyCodes({ drinkId: drink.id, codes });
            } catch (syncError) {
                console.error(syncError);
                setError(
                    included
                        ? "Il drink è nel menù, ma i clienti della festa non riescono ancora a vederlo. Riprova."
                        : "Il drink è fuori dal menù, ma resta visibile ai clienti della festa. Riprova."
                );
            }
        },
        [user, parties]
    );

    const toggleDrinkInParty = useCallback(
        async ({ drink, partyId }) => {
            if (!user || !drink?.id || !partyId) {
                return null;
            }

            const target = parties.find((party) => party.id === partyId);

            if (!target) {
                return null;
            }

            setPendingPartyId(partyId);
            setError("");

            try {
                const current = Array.isArray(target.menuDrinkIds) ? target.menuDrinkIds : [];
                const included = current.includes(drink.id);
                const next = included ? current.filter((id) => id !== drink.id) : [...current, drink.id];

                await setPartyMenu({ code: partyId, drinkIds: next });
                await syncDrinkParties({ drink, partyId, included: !included });

                setParties((currentParties) =>
                    currentParties.map((party) =>
                        party.id === partyId ? { ...party, menuDrinkIds: next } : party
                    )
                );

                return { partyId, partyName: target.name, added: !included };
            } catch (toggleError) {
                console.error(toggleError);
                setError("Non è stato possibile aggiornare la lista della festa. Riprova.");

                return null;
            } finally {
                setPendingPartyId("");
            }
        },
        [user, parties, syncDrinkParties]
    );

    // creata apposta dal selettore di Esplora: la festa nasce già con
    // quel drink nel menù, senza passare dalla pagina Festa
    const createPartyWithDrink = useCallback(
        async ({ drink, name }) => {
            if (!user || !drink?.id) {
                return null;
            }

            setCreatingParty(true);
            setError("");

            try {
                const trimmedName = String(name ?? "").trim().slice(0, PARTY_NAME_MAX_LENGTH);
                const code = await createParty({ user, name: trimmedName, pantry: [] });

                await setPartyMenu({ code, drinkIds: [drink.id] });
                await syncDrinkParties({ drink, partyId: code, included: true });

                const created = {
                    id: code,
                    code,
                    name: trimmedName || "Festa senza nome",
                    hostId: user.uid,
                    active: true,
                    started: false,
                    menuDrinkIds: [drink.id]
                };

                setParties((current) => [created, ...current]);

                return { partyId: created.id, partyName: created.name, added: true };
            } catch (createError) {
                console.error(createError);
                setError("Non è stato possibile aprire la festa. Riprova.");

                return null;
            } finally {
                setCreatingParty(false);
            }
        },
        [user, syncDrinkParties]
    );

    // l'host aggiorna la dispensa personale: le feste aperte (in
    // preparazione o già avviate) ricevono le stesse aggiunte. Ogni festa
    // si sincronizza per conto suo, così una che fallisce non blocca le
    // altre
    const syncPantryToOpenParties = useCallback(
        async (pantry) => {
            if (openParties.length === 0) {
                return;
            }

            const results = await Promise.allSettled(
                openParties.map((party) => syncPartyInventoryFromPantry({ code: party.id, pantry }))
            );

            results.forEach((result) => {
                if (result.status === "rejected") {
                    console.error(result.reason);
                }
            });
        },
        [openParties]
    );

    const value = useMemo(
        () => ({
            parties: user ? parties : [],
            openParties,
            loading: authLoading || (Boolean(user) && loading),
            error: user ? error : "",
            pendingPartyId,
            creatingParty,
            toggleDrinkInParty,
            createPartyWithDrink,
            syncDrinkParties,
            refresh,
            queuedOrdersCount,
            queuedOrderParties,
            syncPantryToOpenParties
        }),
        [
            parties,
            openParties,
            loading,
            authLoading,
            error,
            pendingPartyId,
            creatingParty,
            user,
            toggleDrinkInParty,
            createPartyWithDrink,
            syncDrinkParties,
            refresh,
            queuedOrdersCount,
            queuedOrderParties,
            syncPantryToOpenParties
        ]
    );

    return <PartyListContext.Provider value={value}>{children}</PartyListContext.Provider>;
}
