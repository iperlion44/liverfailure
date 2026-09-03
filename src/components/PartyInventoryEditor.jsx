import { useEffect, useMemo, useRef, useState } from "react";

import { useInventory } from "../context/useInventory";
import {
    buildPartyInventory,
    defaultAmountFor,
    emptyPartyInventory,
    normalizePartyInventory
} from "../utils/partyInventory";
import { buildMenuShoppingList, combinedPantry } from "../utils/partyPlanning";
import { EXTRAS, NON_ALCOHOLIC, SPIRITS, isExtra } from "../utils/spirits";
import { IconPlus } from "./NavIcons";

const ALCOLICI = [...SPIRITS].sort((first, second) => first.localeCompare(second, "it"));
const ANALCOLICI = [...NON_ALCOHOLIC].sort((first, second) => first.localeCompare(second, "it"));

// ogni modifica va sul server da sola,

const AUTOSAVE_DEBOUNCE_MS = 700;

function PartyInventoryEditor({ inventory, onSave, saving = false, menuDrinks = [] }) {
    const { inventory: pantry } = useInventory();

    const [edit, setEdit] = useState(null);
    const [pickingCategory, setPickingCategory] = useState(null);
    const [toAdd, setToAdd] = useState([]);
    const [autoSaveFailed, setAutoSaveFailed] = useState(false);

    const live = useMemo(() => normalizePartyInventory(inventory), [inventory]);
    const current = edit ? edit.value : live;
    const dirty = edit !== null;

    const saveTimer = useRef(null);

    useEffect(() => () => clearTimeout(saveTimer.current), []);

    // scelte discrete (aggiungi/togli/spunta) partono subito; mentre si
    // scrivono i millilitri aspetto che l'utente smetta di digitare,
    // sennò salverei un valore diverso a ogni cifra
    const scheduleSave = (base, value, delay) => {
        clearTimeout(saveTimer.current);

        saveTimer.current = setTimeout(async () => {
            setAutoSaveFailed(false);

            const ok = await onSave({ base, inventory: value });

            if (!ok) {
                setAutoSaveFailed(true);
                return;
            }

            // se nel frattempo non ho toccato altro, torno a seguire il
            // bancone vero; se invece ho già cambiato altro, quel salvataggio
            // successivo prenderà in carico anche questo
            setEdit((previous) => (previous && previous.value === value ? null : previous));
        }, delay);
    };

    const change = (value, delay = 0) => {
        const base = edit ? edit.base : live;

        setEdit({ base, value });
        scheduleSave(base, value, delay);
    };

    const names = useMemo(
        () => Object.keys(current.amounts).sort((first, second) => first.localeCompare(second, "it")),
        [current.amounts]
    );

    const missingAlcolici = useMemo(
        () => ALCOLICI.filter((name) => !(name in current.amounts)),
        [current.amounts]
    );

    const missingAnalcolici = useMemo(
        () => ANALCOLICI.filter((name) => !(name in current.amounts)),
        [current.amounts]
    );

    const missingFromList = pickingCategory === "alcolici" ? missingAlcolici : missingAnalcolici;

    // quello che manca per fare i drink del menù: dispensa più bancone
    // attuale, ricalcolato a ogni modifica così la lista si aggiorna da
    // sola appena si spunta qualcosa
    const owned = useMemo(() => combinedPantry(pantry, current), [pantry, current]);

    const missingForMenu = useMemo(
        () => (menuDrinks.length > 0 ? buildMenuShoppingList(menuDrinks, owned).missing : []),
        [menuDrinks, owned]
    );

    // spuntare un ingrediente mancante lo mette sul bancone,
    // con la dose di default: sparisce dalla lista della spesa e il menù
    // (che legge lo stesso inventario) si aggiorna da solo
    const markPurchased = (name) => {
        if (isExtra(name)) {
            change({ ...current, extras: [...current.extras, name] });
            return;
        }

        change({
            ...current,
            amounts: { ...current.amounts, [name]: defaultAmountFor(name) }
        });
    };

    const removeAmount = (name) => {
        const amounts = { ...current.amounts };

        delete amounts[name];

        change({ ...current, amounts });
    };

    // a 0 ml o meno l'ingrediente è finito: lo tolgo subito dal bancone,
    // stessa cosa che farebbe "Togli", così ricompare tra i mancanti
    // senza bisogno di un altro passaggio
    const changeAmount = (name, value) => {
        const amount = Number(value);

        if (!Number.isFinite(amount) || amount <= 0) {
            removeAmount(name);
            return;
        }

        change(
            {
                ...current,
                amounts: {
                    ...current.amounts,
                    [name]: Math.round(amount)
                }
            },
            AUTOSAVE_DEBOUNCE_MS
        );
    };

    const openPicker = (category) => {
        setToAdd([]);
        setPickingCategory(category);
    };

    const closePicker = () => {
        setPickingCategory(null);
        setToAdd([]);
    };

    const toggleToAdd = (name) => {
        setToAdd((previous) =>
            previous.includes(name) ? previous.filter((item) => item !== name) : [...previous, name]
        );
    };

    useEffect(() => {
        if (!pickingCategory) {
            return undefined;
        }

        const handleKeyDown = (event) => {
            if (event.key === "Escape") {
                closePicker();
            }
        };

        document.addEventListener("keydown", handleKeyDown);

        return () => document.removeEventListener("keydown", handleKeyDown);
    }, [pickingCategory]);

    const confirmAdd = () => {
        if (toAdd.length === 0) {
            closePicker();
            return;
        }

        const amounts = { ...current.amounts };

        toAdd.forEach((name) => {
            amounts[name] = defaultAmountFor(name);
        });

        change({ ...current, amounts });
        closePicker();
    };

    const toggleExtra = (name) => {
        change({
            ...current,
            extras: current.extras.includes(name)
                ? current.extras.filter((extra) => extra !== name)
                : [...current.extras, name]
        });
    };

    const importPantry = () => {
        change(buildPartyInventory(pantry, current));
    };

    return (
        <div className="party-inventory">
            <div className="form-actions">
                <button
                    type="button"
                    className="btn btn-primary btn-hero"
                    onClick={() => openPicker("alcolici")}
                    disabled={missingAlcolici.length === 0}
                >
                    <IconPlus />
                    Aggiungi alcolici
                </button>

                <button
                    type="button"
                    className="btn btn-primary btn-hero"
                    onClick={() => openPicker("analcolici")}
                    disabled={missingAnalcolici.length === 0}
                >
                    <IconPlus />
                    Aggiungi analcolici
                </button>

                <button
                    type="button"
                    className="btn btn-primary btn-hero"
                    onClick={() => openPicker("extra")}
                >
                    <IconPlus />
                    Extra
                </button>

                <button
                    type="button"
                    className="btn btn-outline"
                    onClick={importPantry}
                    disabled={pantry.length === 0}
                >
                    Dalla mia dispensa
                </button>

                <button
                    type="button"
                    className="btn btn-quiet btn-sm"
                    onClick={() => change(emptyPartyInventory())}
                >
                    Svuota
                </button>
            </div>

            {menuDrinks.length > 0 && (
                <div className="shopping">
                    <div className="shopping-head">
                        <span className="field-label">Ingredienti mancanti per il menù</span>
                    </div>

                    {missingForMenu.length === 0 ? (
                        <p className="pantry-verdict">Hai già tutto quello che serve per il menù.</p>
                    ) : (
                        <ul className="shopping-list">
                            {missingForMenu.map((item) => (
                                <li key={item.name}>
                                    <label>
                                        <input
                                            type="checkbox"
                                            aria-label={`${item.name} acquistato`}
                                            onChange={() => markPurchased(item.name)}
                                        />
                                        {item.name}
                                    </label>
                                    <span className="ingredient-qty">{item.quantity || "q.b."}</span>
                                </li>
                            ))}
                        </ul>
                    )}
                </div>
            )}

            <div className="ingredient-section">
                <span className="ingredient-section-title">Bottiglie e bibite</span>

                {names.length === 0 ? (
                    <p className="field-hint">Bancone vuoto.</p>
                ) : (
                    <ul className="stock-list">
                        {names.map((name) => (
                            <li className="stock" key={name}>
                                <span className="stock-name">{name}</span>

                                <div className="ingredient-row-qty-group">
                                    <input
                                        type="number"
                                        inputMode="numeric"
                                        min="0"
                                        step="50"
                                        className="input ingredient-row-qty"
                                        aria-label={`Millilitri di ${name}`}
                                        value={current.amounts[name]}
                                        onChange={(event) => changeAmount(name, event.target.value)}
                                    />
                                    <span className="ingredient-row-qty-unit">ml</span>
                                </div>

                                <button
                                    type="button"
                                    className="btn btn-danger-quiet btn-sm"
                                    onClick={() => removeAmount(name)}
                                >
                                    Togli
                                </button>
                            </li>
                        ))}
                    </ul>
                )}

            </div>

            <div className="form-actions pantry-actions">
                <span className="field-hint" role="status">
                    {saving || dirty ? "Salvo..." : "Bancone aggiornato."}
                </span>
            </div>

            {autoSaveFailed && (
                <div className="notice notice-error" role="alert">
                    Non sono riuscito a salvare l'ultima modifica al bancone. Riprova.
                </div>
            )}

            {pickingCategory && (
                <div
                    className="modal-overlay"
                    role="presentation"
                    onMouseDown={(event) => {
                        if (event.target === event.currentTarget) {
                            closePicker();
                        }
                    }}
                >
                    <div
                        className="modal"
                        role="dialog"
                        aria-modal="true"
                        aria-labelledby="bancone-picker-title"
                    >
                        <div className="modal-head">
                            <h2 id="bancone-picker-title" className="recipe-block-title">
                                {pickingCategory === "alcolici"
                                    ? "Aggiungi alcolici"
                                    : pickingCategory === "analcolici"
                                        ? "Aggiungi analcolici"
                                        : "Extra"}
                            </h2>
                            <button
                                type="button"
                                className="modal-close"
                                onClick={closePicker}
                                aria-label="Chiudi"
                            >
                                ×
                            </button>
                        </div>

                        {pickingCategory === "extra" ? (
                            <>
                                <div className="form-actions modal-confirm-bar">
                                    <button type="button" className="btn btn-outline" onClick={closePicker}>
                                        Chiudi
                                    </button>
                                </div>

                                <div className="pantry-options">
                                    {EXTRAS.map((name) => (
                                        <label
                                            key={name}
                                            className={
                                                current.extras.includes(name)
                                                    ? "pantry-option is-active"
                                                    : "pantry-option"
                                            }
                                        >
                                            <input
                                                type="checkbox"
                                                className="visually-hidden"
                                                checked={current.extras.includes(name)}
                                                onChange={() => toggleExtra(name)}
                                            />
                                            {name}
                                        </label>
                                    ))}
                                </div>
                            </>
                        ) : (
                            <>
                                <div className="form-actions modal-confirm-bar">
                                    <button
                                        type="button"
                                        className="btn btn-success btn-hero"
                                        onClick={confirmAdd}
                                        disabled={toAdd.length === 0}
                                    >
                                        {toAdd.length > 0 ? `Aggiungi ${toAdd.length}` : "Aggiungi"}
                                    </button>
                                    <button type="button" className="btn btn-outline" onClick={closePicker}>
                                        Annulla
                                    </button>
                                </div>

                                {missingFromList.length === 0 ? (
                                    <p className="pantry-verdict">Hai già tutto sul bancone.</p>
                                ) : (
                                    <div className="pantry-options">
                                        {missingFromList.map((name) => (
                                            <label
                                                key={name}
                                                className={
                                                    toAdd.includes(name)
                                                        ? "pantry-option is-active"
                                                        : "pantry-option"
                                                }
                                            >
                                                <input
                                                    type="checkbox"
                                                    className="visually-hidden"
                                                    checked={toAdd.includes(name)}
                                                    onChange={() => toggleToAdd(name)}
                                                />
                                                {name}
                                            </label>
                                        ))}
                                    </div>
                                )}
                            </>
                        )}
                    </div>
                </div>
            )}
        </div>
    );
}

export default PartyInventoryEditor;
