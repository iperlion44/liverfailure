import { useEffect, useRef, useState } from "react";

import { PARTY_NAME_MAX_LENGTH } from "../firebase/party";
import { formatPartyCode } from "../utils/partyCode";

// il selettore che appare toccando il "più" su una card in Esplora:
// mostra le feste aperte (spuntando quelle che hanno già il drink) e
// offre di aprirne una nuova al volo, senza lasciare la pagina
function PartyPickerModal({
    drink,
    parties,
    pendingPartyId,
    creating,
    error,
    onToggleParty,
    onCreateParty,
    onClose
}) {
    const [name, setName] = useState("");
    const dialogRef = useRef(null);

    useEffect(() => {
        dialogRef.current?.focus();
    }, []);

    useEffect(() => {
        const handleKeyDown = (event) => {
            if (event.key === "Escape") {
                onClose();
            }
        };

        document.addEventListener("keydown", handleKeyDown);

        return () => document.removeEventListener("keydown", handleKeyDown);
    }, [onClose]);

    if (!drink) {
        return null;
    }

    const handleCreateSubmit = async (event) => {
        event.preventDefault();

        const result = await onCreateParty(name);

        if (result) {
            setName("");
        }
    };

    return (
        <div
            className="modal-overlay"
            role="presentation"
            onMouseDown={(event) => {
                if (event.target === event.currentTarget) {
                    onClose();
                }
            }}
        >
            <div
                className="modal"
                role="dialog"
                aria-modal="true"
                aria-labelledby="party-picker-title"
                tabIndex={-1}
                ref={dialogRef}
            >
                <div className="modal-head">
                    <h2 id="party-picker-title" className="recipe-block-title">
                        Aggiungi a una festa
                    </h2>
                    <button type="button" className="modal-close" onClick={onClose} aria-label="Chiudi">
                        ×
                    </button>
                </div>

                <p className="recipe-text modal-lede">
                    Scegli in quale festa mettere &laquo;{drink.name || "questo drink"}&raquo;, oppure
                    aprine una nuova qui sotto.
                </p>

                {error && (
                    <div className="form-error" role="alert">
                        {error}
                    </div>
                )}

                {parties.length === 0 ? (
                    <p className="pantry-verdict">Non hai ancora una festa aperta: creane una qui sotto.</p>
                ) : (
                    <ul className="menu-list party-picker-list">
                        {parties.map((party) => {
                            const included = Array.isArray(party.menuDrinkIds)
                                ? party.menuDrinkIds.includes(drink.id)
                                : false;
                            const busy = pendingPartyId === party.id;

                            return (
                                <li className="menu-item" key={party.id}>
                                    <div className="menu-item-text">
                                        <span className="menu-item-name">
                                            {party.name || "Festa senza nome"}
                                        </span>
                                        <span className="party-row-code">
                                            {formatPartyCode(party.id)}
                                            {party.started === false && " · in preparazione"}
                                        </span>
                                    </div>

                                    <button
                                        type="button"
                                        className={included ? "btn btn-primary btn-sm" : "btn btn-outline btn-sm"}
                                        aria-pressed={included}
                                        disabled={busy}
                                        onClick={() => onToggleParty(party)}
                                    >
                                        {busy ? "Un attimo..." : included ? "Aggiunto ✓" : "Aggiungi"}
                                    </button>
                                </li>
                            );
                        })}
                    </ul>
                )}

                <form className="party-picker-form" onSubmit={handleCreateSubmit}>
                    <div className="field">
                        <label className="field-label" htmlFor="picker-party-name">
                            Nuova festa
                        </label>
                        <input
                            id="picker-party-name"
                            className="input"
                            type="text"
                            placeholder="Capodanno da me"
                            value={name}
                            maxLength={PARTY_NAME_MAX_LENGTH}
                            onChange={(event) => setName(event.target.value)}
                        />
                    </div>

                    <div className="form-actions">
                        <button type="submit" className="btn btn-success" disabled={creating}>
                            {creating ? "Apro..." : "Crea festa e aggiungi"}
                        </button>
                        <button type="button" className="btn btn-outline" onClick={onClose}>
                            Fatto
                        </button>
                    </div>
                </form>
            </div>
        </div>
    );
}

export default PartyPickerModal;
