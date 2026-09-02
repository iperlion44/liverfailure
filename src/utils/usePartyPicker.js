import { useEffect, useRef, useState } from "react";

import { usePartyList } from "../context/usePartyList";

// stessa logica del "+" della festa in Esplora, riusabile ovunque
// compaia una griglia di drink (Esplora, Preferiti, Miei drink)
export function usePartyPicker() {
    const {
        openParties,
        pendingPartyId,
        creatingParty,
        error: partyListError,
        toggleDrinkInParty,
        createPartyWithDrink
    } = usePartyList();

    const [pickerDrink, setPickerDrink] = useState(null);
    const [partyNotice, setPartyNotice] = useState(null);
    const partyNoticeTimeoutRef = useRef(null);

    useEffect(() => () => clearTimeout(partyNoticeTimeoutRef.current), []);

    const announceResult = (drinkName, result) => {
        if (!result) {
            return;
        }

        clearTimeout(partyNoticeTimeoutRef.current);
        setPartyNotice({
            code: result.partyId,
            text: result.added
                ? `"${drinkName}" aggiunto a "${result.partyName || "Festa senza nome"}".`
                : `"${drinkName}" tolto da "${result.partyName || "Festa senza nome"}".`
        });
        partyNoticeTimeoutRef.current = setTimeout(() => setPartyNotice(null), 5000);
    };

    const handleToggleParty = async (party) => {
        if (!pickerDrink) {
            return null;
        }

        const result = await toggleDrinkInParty({ drink: pickerDrink, partyId: party.id });

        announceResult(pickerDrink.name, result);

        return result;
    };

    const handleCreateParty = async (name) => {
        if (!pickerDrink) {
            return null;
        }

        const result = await createPartyWithDrink({ drink: pickerDrink, name });

        announceResult(pickerDrink.name, result);

        return result;
    };

    const partyActionFor = (drink, user) =>
        user
            ? {
                  active: openParties.some((party) => party.menuDrinkIds?.includes(drink.id)),
                  onOpen: () => setPickerDrink(drink)
              }
            : null;

    return {
        openParties,
        pendingPartyId,
        creatingParty,
        partyListError,
        pickerDrink,
        setPickerDrink,
        partyNotice,
        partyActionFor,
        handleToggleParty,
        handleCreateParty
    };
}
