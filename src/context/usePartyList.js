import { createContext, useContext } from "react";

// stessa divisione di useAuth/useInventory: il contesto sta qui, il
// provider nel .jsx
export const PartyListContext = createContext({
    parties: [],
    openParties: [],
    loading: true,
    error: "",
    pendingPartyId: "",
    creatingParty: false,
    toggleDrinkInParty: async () => null,
    createPartyWithDrink: async () => null,
    refresh: () => {},
    queuedOrdersCount: 0,
    queuedOrderParties: [],
    syncPantryToOpenParties: async () => {}
});

export function usePartyList() {
    return useContext(PartyListContext);
}
