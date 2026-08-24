import { useState } from "react";
import { Link } from "react-router-dom";

import { collection, addDoc, serverTimestamp } from "firebase/firestore";

import db from "../firebase/firestore";

import { useAuth } from "../context/useAuth";
import { showNotification } from "../utils/notifications";
import { SPIRITS, NON_ALCOHOLIC, EXTRAS } from "../utils/spirits";
import { readDrinkImage, validateDrinkImage } from "../utils/drinkImage";
import { buildIngredients, DESCRIPTION_MAX_LENGTH } from "../utils/drink";

const emptyIngredientRow = () => ({ name: "", quantity: "" });

function CreateDrink() {
    const { user } = useAuth();

    const [name, setName] = useState("");
    const [ingredients, setIngredients] = useState([emptyIngredientRow()]);
    const [nonAlcoholicIngredients, setNonAlcoholicIngredients] = useState([]);
    const [extraIngredients, setExtraIngredients] = useState([]);
    const [preparation, setPreparation] = useState("");
    const [description, setDescription] = useState("");
    const [isPublic, setIsPublic] = useState(false);
    const [imageData, setImageData] = useState("");
    const [imageLoading, setImageLoading] = useState(false);
    const [saving, setSaving] = useState(false);
    const [error, setError] = useState("");
    const [savedName, setSavedName] = useState("");

    const handleImageChange = async (event) => {
        const file = event.target.files?.[0];

        if (!file) {
            return;
        }

        const validationError = validateDrinkImage(file);

        if (validationError) {
            setError(validationError);
            event.target.value = "";
            return;
        }

        setError("");
        setImageLoading(true);

        try {
            const dataUrl = await readDrinkImage(file);
            setImageData(dataUrl);
        } catch (imageError) {
            console.error(imageError);
            setError("Non è stato possibile leggere l'immagine. Riprova.");
        } finally {
            setImageLoading(false);
        }
    };

    const removeImage = () => setImageData("");

    const updateIngredient = (index, field, value) => {
        setIngredients((previous) =>
            previous.map((ingredient, ingredientIndex) =>
                ingredientIndex === index ? { ...ingredient, [field]: value } : ingredient
            )
        );
    };

    const addIngredientRow = () => {
        setIngredients((previous) => [...previous, emptyIngredientRow()]);
    };

    const removeIngredientRow = (index) => {
        setIngredients((previous) => previous.filter((_, ingredientIndex) => ingredientIndex !== index));
    };

    const updateNonAlcoholicIngredient = (index, field, value) => {
        setNonAlcoholicIngredients((previous) =>
            previous.map((ingredient, ingredientIndex) =>
                ingredientIndex === index ? { ...ingredient, [field]: value } : ingredient
            )
        );
    };

    const addNonAlcoholicIngredientRow = () => {
        setNonAlcoholicIngredients((previous) => [...previous, emptyIngredientRow()]);
    };

    const removeNonAlcoholicIngredientRow = (index) => {
        setNonAlcoholicIngredients((previous) =>
            previous.filter((_, ingredientIndex) => ingredientIndex !== index)
        );
    };

    const updateExtraIngredient = (index, field, value) => {
        setExtraIngredients((previous) =>
            previous.map((ingredient, ingredientIndex) =>
                ingredientIndex === index ? { ...ingredient, [field]: value } : ingredient
            )
        );
    };

    const addExtraIngredientRow = () => {
        setExtraIngredients((previous) => [...previous, emptyIngredientRow()]);
    };

    const removeExtraIngredientRow = (index) => {
        setExtraIngredients((previous) => previous.filter((_, ingredientIndex) => ingredientIndex !== index));
    };

    const handleSubmit = async (event) => {
        event.preventDefault();
        setError("");
        setSavedName("");

        const trimmedName = name.trim();
        const trimmedPreparation = preparation.trim();

        // l'attributo required dell'html non blocca gli spazi vuoti, ma
        // firestore sì, quindi meglio controllarlo qui invece di far
        // uscire un errore di permessi a caso
        if (!trimmedName) {
            setError("Dai un nome al drink.");
            return;
        }

        if (!trimmedPreparation) {
            setError("Scrivi come si prepara il drink.");
            return;
        }

        const cleanIngredients = buildIngredients({
            alcoholic: ingredients,
            nonAlcoholic: nonAlcoholicIngredients,
            extras: extraIngredients
        });

        if (cleanIngredients.length === 0) {
            setError("Aggiungi almeno un ingrediente: alcolico, analcolico o extra.");
            return;
        }

        try {
            setSaving(true);

            await addDoc(collection(db, "drinks"), {
                name: trimmedName,
                description: description.trim(),
                ingredients: cleanIngredients,
                preparation: trimmedPreparation,
                image: imageData,
                isPublic,
                authorId: user.uid,
                authorName: user.displayName || "Utente",
                createdAt: serverTimestamp()
            });

            showNotification("Nuovo drink", `${trimmedName} è stato creato con successo.`);

            setSavedName(trimmedName);
            setName("");
            setDescription("");
            setIngredients([emptyIngredientRow()]);
            setNonAlcoholicIngredients([]);
            setExtraIngredients([]);
            setPreparation("");
            setIsPublic(false);
            removeImage();
        } catch (error) {
            console.error(error);
            setError("Non è stato possibile salvare il drink. Controlla la connessione e riprova.");
        } finally {
            setSaving(false);
        }
    };

    return (
        <div className="shell-narrow page">
            <header className="page-head">
                <div className="page-head-text">
                    <span className="eyebrow">Nuova ricetta</span>
                    <h1 className="display display-l">Crea un drink</h1>
                    <p className="lede">
                        Scrivi la ricetta come la racconteresti a voce.
                        Le dosi esatte sono facoltative.
                    </p>
                </div>
            </header>

            {savedName && (
                <div className="notice" role="status">
                    <strong>{savedName}</strong> è salvato.{" "}
                    <Link to="/my-drinks">Vedi i tuoi drink</Link> oppure
                    continua a scriverne un altro qui sotto.
                </div>
            )}

            {error && (
                <div className="form-error" role="alert">
                    {error}
                </div>
            )}

            <form onSubmit={handleSubmit}>
                <div className="field">
                    <label className="field-label" htmlFor="drink-name">
                        Nome del drink
                    </label>
                    <input
                        id="drink-name"
                        className="input"
                        type="text"
                        placeholder="Negroni sbagliato"
                        value={name}
                        onChange={(event) => setName(event.target.value)}
                        required
                    />
                </div>

                <div className="field">
                    <label className="field-label" htmlFor="drink-description">
                        Descrizione
                    </label>
                    <textarea
                        id="drink-description"
                        className="textarea"
                        style={{ minHeight: 90 }}
                        placeholder="Una riga per far capire com'è e quando si beve."
                        value={description}
                        onChange={(event) => setDescription(event.target.value)}
                        maxLength={DESCRIPTION_MAX_LENGTH}
                    />
                    <span className="field-hint">
                        {description.length}/{DESCRIPTION_MAX_LENGTH}
                    </span>
                </div>

                <div className="field">
                    <label className="field-label" htmlFor="drink-image">
                        Foto (facoltativa)
                    </label>
                    <span className="field-hint">
                        Se vuoi, aggiungi una foto del drink. Non è
                        obbligatoria.
                    </span>

                    {imageData ? (
                        <div className="image-picker">
                            <img className="image-picker-preview" src={imageData} alt="Anteprima del drink" />
                            <button type="button" className="btn btn-outline btn-sm" onClick={removeImage}>
                                Rimuovi foto
                            </button>
                        </div>
                    ) : (
                        <>
                            <input
                                id="drink-image"
                                className="input"
                                type="file"
                                accept="image/*"
                                onChange={handleImageChange}
                                disabled={imageLoading}
                            />
                            {imageLoading && <span className="field-hint">Carico l'immagine...</span>}
                        </>
                    )}
                </div>

                <div className="field">
                    <label className="field-label">Ingredienti</label>
                    <span className="field-hint">
                        Aggiungi almeno un ingrediente, alcolico,
                        analcolico o extra. La quantità è facoltativa.
                    </span>

                    <div className="ingredient-section">
                        <span className="ingredient-section-title">Alcolici</span>

                        {ingredients.map((ingredient, index) => (
                            <div className="ingredient-row" key={index}>
                                <select
                                    className="input ingredient-row-name"
                                    aria-label="Alcolico"
                                    value={ingredient.name}
                                    onChange={(event) => updateIngredient(index, "name", event.target.value)}
                                >
                                    <option value="">Scegli un alcolico</option>
                                    {SPIRITS.map((spirit) => (
                                        <option key={spirit} value={spirit}>
                                            {spirit}
                                        </option>
                                    ))}
                                </select>

                                <div className="ingredient-row-qty-group">
                                    <input
                                        type="number"
                                        inputMode="numeric"
                                        min="0"
                                        step="1"
                                        className="input ingredient-row-qty"
                                        aria-label="Quantità in millilitri"
                                        placeholder="es. 50"
                                        value={ingredient.quantity}
                                        onChange={(event) => updateIngredient(index, "quantity", event.target.value)}
                                    />
                                    <span className="ingredient-row-qty-unit">ml</span>
                                </div>

                                <button
                                    type="button"
                                    className="btn btn-danger-quiet btn-sm ingredient-row-remove"
                                    onClick={() => removeIngredientRow(index)}
                                >
                                    Rimuovi
                                </button>
                            </div>
                        ))}

                        <button type="button" className="btn btn-outline btn-sm" onClick={addIngredientRow}>
                            + Aggiungi un altro alcolico
                        </button>
                    </div>

                    <div className="ingredient-section">
                        <span className="ingredient-section-title">Analcolici</span>

                        {nonAlcoholicIngredients.map((ingredient, index) => (
                            <div className="ingredient-row" key={index}>
                                <select
                                    className="input ingredient-row-name"
                                    aria-label="Analcolico"
                                    value={ingredient.name}
                                    onChange={(event) =>
                                        updateNonAlcoholicIngredient(index, "name", event.target.value)
                                    }
                                >
                                    <option value="">Scegli un analcolico</option>
                                    {NON_ALCOHOLIC.map((item) => (
                                        <option key={item} value={item}>
                                            {item}
                                        </option>
                                    ))}
                                </select>

                                <div className="ingredient-row-qty-group">
                                    <input
                                        type="number"
                                        inputMode="numeric"
                                        min="0"
                                        step="1"
                                        className="input ingredient-row-qty"
                                        aria-label="Quantità in millilitri"
                                        placeholder="es. 100"
                                        value={ingredient.quantity}
                                        onChange={(event) =>
                                            updateNonAlcoholicIngredient(index, "quantity", event.target.value)
                                        }
                                    />
                                    <span className="ingredient-row-qty-unit">ml</span>
                                </div>

                                <button
                                    type="button"
                                    className="btn btn-danger-quiet btn-sm ingredient-row-remove"
                                    onClick={() => removeNonAlcoholicIngredientRow(index)}
                                >
                                    Rimuovi
                                </button>
                            </div>
                        ))}

                        <button
                            type="button"
                            className="btn btn-outline btn-sm"
                            onClick={addNonAlcoholicIngredientRow}
                        >
                            + Aggiungi un analcolico
                        </button>
                    </div>

                    <div className="ingredient-section">
                        <span className="ingredient-section-title">Extra</span>

                        {extraIngredients.map((ingredient, index) => (
                            <div className="ingredient-row" key={index}>
                                <select
                                    className="input ingredient-row-name"
                                    aria-label="Extra"
                                    value={ingredient.name}
                                    onChange={(event) => updateExtraIngredient(index, "name", event.target.value)}
                                >
                                    <option value="">Scegli un extra</option>
                                    {EXTRAS.map((item) => (
                                        <option key={item} value={item}>
                                            {item}
                                        </option>
                                    ))}
                                </select>

                                <input
                                    type="text"
                                    className="input ingredient-row-qty"
                                    aria-label="Quantità"
                                    placeholder="es. 2 spicchi, q.b."
                                    value={ingredient.quantity}
                                    onChange={(event) => updateExtraIngredient(index, "quantity", event.target.value)}
                                />

                                <button
                                    type="button"
                                    className="btn btn-danger-quiet btn-sm ingredient-row-remove"
                                    onClick={() => removeExtraIngredientRow(index)}
                                >
                                    Rimuovi
                                </button>
                            </div>
                        ))}

                        <button type="button" className="btn btn-outline btn-sm" onClick={addExtraIngredientRow}>
                            + Aggiungi un extra
                        </button>
                    </div>
                </div>

                <div className="field">
                    <label className="field-label" htmlFor="drink-preparation">
                        Preparazione
                    </label>
                    <textarea
                        id="drink-preparation"
                        className="textarea"
                        placeholder="Ghiaccio nel bicchiere, versa tutto, mescola, scorza d'arancia."
                        value={preparation}
                        onChange={(event) => setPreparation(event.target.value)}
                        required
                    />
                </div>

                <label className="checkbox-row">
                    <input
                        type="checkbox"
                        checked={isPublic}
                        onChange={(event) => setIsPublic(event.target.checked)}
                    />
                    <span className="checkbox-text">
                        Pubblica in libreria
                        <span className="checkbox-hint">
                            Chiunque potrà leggerla in Esplora, con il tuo
                            nome accanto. Puoi cambiare idea più tardi.
                        </span>
                    </span>
                </label>

                <div className="form-actions">
                    <button type="submit" className="btn btn-primary" disabled={saving}>
                        {saving ? "Salvo..." : "Salva il drink"}
                    </button>
                    <Link to="/my-drinks" className="btn btn-outline">
                        Annulla
                    </Link>
                </div>
            </form>
        </div>
    );
}

export default CreateDrink;
