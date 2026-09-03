import { useCallback, useSyncExternalStore } from "react";
//consiglio AI:
// tengo una MediaQueryList per stringa invece di ricrearla ogni volta, perche'window.matchMedia' è pesante e non voglio fare un sacco di oggetti identici
const lists = new Map();

function listFor(queryString) {
    let list = lists.get(queryString);

    if (!list) {
        list = window.matchMedia(queryString);
        lists.set(queryString, list);
    }

    return list;
}
//consiglio AI:
// serve per non montare proprio un componente che a quella larghezza
// il CSS nasconderebbe comunque
export function useMediaQuery(queryString) {
    const subscribe = useCallback(
        (onStoreChange) => {
            const list = listFor(queryString);

            list.addEventListener("change", onStoreChange);

            return () => list.removeEventListener("change", onStoreChange);
        },
        [queryString]
    );

    const getSnapshot = useCallback(() => listFor(queryString).matches, [queryString]);

    return useSyncExternalStore(subscribe, getSnapshot, () => false);
}
