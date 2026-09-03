import { useCallback, useEffect, useMemo, useRef, useState } from "react";

import { fetchInventory, saveInventory as persistInventory } from "../firebase/inventory";
import { readCachedInventory, writeCachedInventory } from "../utils/inventoryStorage";
import { useAuth } from "./useAuth";
import { InventoryContext } from "./useInventory";

const EMPTY = { uid: null, inventory: [], loading: true, isCached: false, error: "" };

// la dispensa serve a mezza app (badge sulle card, filtro in Esplora,
// checklist nel dettaglio, punto di partenza della festa): la leggo una
// volta sola qui invece che in ogni pagina
export function InventoryProvider({ children }) {
    const { user, loading: authLoading } = useAuth();

    // mi porto dietro l'uid a cui appartengono i dati: al cambio account
    // così non resta a video per un istante la dispensa di prima
    const [state, setState] = useState(EMPTY);

    // se cambio account mentre un salvataggio è ancora in volo, la
    // risposta in ritardo non deve marchiare lo stato con l'uid vecchio
    const currentUid = useRef(null);

    useEffect(() => {
        currentUid.current = user?.uid ?? null;
    }, [user]);

    useEffect(() => {
        if (authLoading || !user) {
            return undefined;
        }

        let cancelled = false;

        const load = async () => {
            const cached = readCachedInventory(user.uid);

            if (cached.length > 0) {
                setState({ uid: user.uid, inventory: cached, loading: true, isCached: true, error: "" });
            }

            try {
                if (!navigator.onLine) {
                    throw new Error("Offline");
                }

                const remote = await fetchInventory(user.uid);

                if (cancelled) {
                    return;
                }

                setState({ uid: user.uid, inventory: remote, loading: false, isCached: false, error: "" });
                writeCachedInventory(user.uid, remote);
            } catch (loadError) {
                console.error(loadError);

                if (!cancelled) {
                    setState({
                        uid: user.uid,
                        inventory: cached,
                        loading: false,
                        isCached: cached.length > 0,
                        error: ""
                    });
                }
            }
        };

        load();

        return () => {
            cancelled = true;
        };
    }, [user, authLoading]);

    // salvo subito in locale e poi provo firestore: se sono offline la
    // dispensa resta usabile per i badge e la checklist
    const saveInventory = useCallback(
        async (nextInventory) => {
            if (!user) {
                return [];
            }

            setState({
                uid: user.uid,
                inventory: nextInventory,
                loading: false,
                isCached: false,
                error: ""
            });
            writeCachedInventory(user.uid, nextInventory);

            try {
                if (!navigator.onLine) {
                    throw new Error("Offline");
                }

                const saved = await persistInventory(user.uid, nextInventory);

                writeCachedInventory(user.uid, saved);

                if (currentUid.current === user.uid) {
                    setState({ uid: user.uid, inventory: saved, loading: false, isCached: false, error: "" });
                }

                return saved;
            } catch (saveError) {
                console.error(saveError);

                if (currentUid.current === user.uid) {
                    setState({
                        uid: user.uid,
                        inventory: nextInventory,
                        loading: false,
                        isCached: true,
                        error: "Sei offline: la dispensa è salvata sul dispositivo e si sincronizza appena torni online."
                    });
                }

                return nextInventory;
            }
        },
        [user]
    );

    const value = useMemo(() => {
        const mine = Boolean(user) && state.uid === user?.uid;
        const inventory = mine ? state.inventory : [];

        return {
            inventory,
            inventorySet: new Set(inventory),
            loading: authLoading || (Boolean(user) && (!mine || state.loading)),
            isCached: mine ? state.isCached : false,
            error: mine ? state.error : "",
            saveInventory
        };
    }, [state, user, authLoading, saveInventory]);

    return <InventoryContext.Provider value={value}>{children}</InventoryContext.Provider>;
}
