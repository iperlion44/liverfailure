import { createContext, useContext } from "react";

// stessa divisione di useAuth: il contesto sta qui, il provider nel .jsx
export const InventoryContext = createContext({
    inventory: [],
    inventorySet: new Set(),
    loading: true,
    isCached: false,
    error: "",
    saveInventory: async () => {}
});

export function useInventory() {
    return useContext(InventoryContext);
}
