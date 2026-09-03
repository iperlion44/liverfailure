import { useMemo, useState } from "react";
import { Link } from "react-router-dom";

import { useInventory } from "../context/useInventory";
import { usePartyList } from "../context/usePartyList";
import { EXTRAS, NON_ALCOHOLIC, SPIRITS } from "../utils/spirits";
import { Loader } from "../components/Loader";
import { IconSearch } from "../components/NavIcons";

const GROUPS = [
    { title: "Alcolici", items: SPIRITS },
    { title: "Analcolici", items: NON_ALCOHOLIC },
    { title: "Extra", items: EXTRAS }
];

function Inventory() {
    const { inventory, loading, isCached, error, saveInventory } = useInventory();
    const { syncPantryToOpenParties } = usePartyList();

    // finché non tocco niente mostro la dispensa salvata; al primo
    // click passo alla mia copia, così non devo aspettare il salvataggio
    // per vedere le spunte muoversi
    const [draft, setDraft] = useState(null);
    const [saving, setSaving] = useState(false);
    const [saved, setSaved] = useState(false);

    const selected = draft ?? inventory;
    const selectedSet = useMemo(() => new Set(selected), [selected]);

    const isDirty =
        draft !== null &&
        (draft.length !== inventory.length || inventory.some((name) => !selectedSet.has(name)));

    const toggle = (name) => {
        setSaved(false);
        setDraft(
            selected.includes(name)
                ? selected.filter((item) => item !== name)
                : [...selected, name]
        );
    };

    const handleSave = async () => {
        setSaving(true);
        setSaved(false);

        const savedInventory = await saveInventory(selected);

        //gestito dall'AI
        // le feste aperte prendono solo le aggiunte, non blocca il salvataggio
        // della dispensa se una festa non risponde
        syncPantryToOpenParties(savedInventory).catch((syncError) => console.error(syncError));

        setDraft(null);
        setSaving(false);
        setSaved(true);
    };

    if (loading) {
        return <Loader label="Apro la dispensa" />;
    }

    return (
        <div className="shell page">
            <header className="page-head">
                <div className="page-head-text">
                    <h1 className="display display-l">Dispensa</h1>
                </div>

                <span className="count">
                    {selected.length}
                    {selected.length === 1 ? " ingrediente" : " ingredienti"}
                </span>
            </header>

            {isCached && <div className="notice">Sei offline: si sincronizza da solo.</div>}

            {error && <div className="notice notice-error">{error}</div>}

            {saved && !isDirty && (
                <div className="notice" role="status">
                    Dispensa aggiornata.
                </div>
            )}

            {GROUPS.map((group) => (
                <section className="pantry-group" key={group.title}>
                    <div className="pantry-group-head">
                        <span className="ingredient-section-title">{group.title}</span>
                    </div>

                    <div className="pantry-options">
                        {group.items.map((item) => (
                            <label
                                key={item}
                                className={
                                    selectedSet.has(item) ? "pantry-option is-active" : "pantry-option"
                                }
                            >
                                {/* durante il salvataggio le blocco: una spunta
                                    messa in quel momento verrebbe persa quando
                                    torno a seguire la dispensa salvata */}
                                <input
                                    type="checkbox"
                                    className="visually-hidden"
                                    checked={selectedSet.has(item)}
                                    disabled={saving}
                                    onChange={() => toggle(item)}
                                />
                                {item}
                            </label>
                        ))}
                    </div>
                </section>
            ))}

            <div className="form-actions pantry-actions">
                <button
                    type="button"
                    className="btn btn-success btn-hero"
                    onClick={handleSave}
                    disabled={saving || !isDirty}
                >
                    {saving ? "Salvo..." : isDirty ? "Salva la dispensa" : "Tutto salvato"}
                </button>

                <Link to="/explore" className="btn btn-outline btn-hero">
                    <IconSearch />
                    Cosa posso fare
                </Link>

                <button
                    type="button"
                    className="btn btn-quiet btn-sm"
                    onClick={() => {
                        setSaved(false);
                        setDraft([]);
                    }}
                    disabled={saving || selected.length === 0}
                >
                    Svuota
                </button>
            </div>
        </div>
    );
}

export default Inventory;
