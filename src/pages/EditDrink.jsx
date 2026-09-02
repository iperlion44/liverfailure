import { useEffect, useState } from "react";

import { doc, getDoc, updateDoc } from "firebase/firestore";

import { Link, useNavigate, useParams } from "react-router-dom";

import db from "../firebase/firestore";

import { useAuth } from "../context/useAuth";
import { Loader } from "../components/Loader";
import EmptyState from "../components/EmptyState";
import {
    buildIngredients,
    normalizeIngredients,
    extractMlValue,
    DESCRIPTION_MAX_LENGTH
} from "../utils/drink";
import { SPIRITS, NON_ALCOHOLIC, EXTRAS, isAlcoholic, isExtra } from "../utils/spirits";
import { readDrinkImage, validateDrinkImage } from "../utils/drinkImage";

const emptyIngredientRow = () => ({ name: "", quantity: "" });

function EditDrink() {
    const { id } = useParams();
    const navigate = useNavigate();
    const { user } = useAuth();

    const [name, setName] = useState("");
    const [description, setDescription] = useState("");
    const [ingredients, setIngredients] = useState([emptyIngredientRow()]);
    const [nonAlcoholicIngredients, setNonAlcoholicIngredients] = useState([]);
    const [extraIngredients, setExtraIngredients] = useState([]);
    const [preparation, setPreparation] = useState("");
    const [isPublic, setIsPublic] = useState(false);
    const [imageData, setImageData] = useState("");
    const [imageLoading, setImageLoading] = useState(false);
    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState(false);
    const [error, setError] = useState("");
    const [forbidden, setForbidden] = useState(false);
    const [missing, setMissing] = useState(false);

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

    useEffect(() => {
        const fetchDrink = async () => {
            try {
                const snapshot = await getDoc(doc(db, "drinks", id));

                if (snapshot.exists()) {
                    const data = snapshot.data();

                    if (data.authorId !== user.uid) {
                        setForbidden(true);
                        return;
                    }

                    setName(data.name || "");
                    setDescription(data.description || "");

                    const loadedIngredients = normalizeIngredients(data.ingredients);

                    const loadedAlcoholic = loadedIngredients
                        .filter((ingredient) => isAlcoholic(ingredient.name))
                        .map((ingredient) => ({
                            ...ingredient,
                            quantity: extractMlValue(ingredient.quantity)
                        }));

                    const loadedExtra = loadedIngredients.filter(
                        (ingredient) => !isAlcoholic(ingredient.name) && isExtra(ingredient.name)
                    );

                    const loadedNonAlcoholic = loadedIngredients
                        .filter((ingredient) => !isAlcoholic(ingredient.name) && !isExtra(ingredient.name))
                        .map((ingredient) => ({
                            ...ingredient,
                            quantity: extractMlValue(ingredient.quantity)
                        }));

                    setIngredients(loadedAlcoholic.length > 0 ? loadedAlcoholic : [emptyIngredientRow()]);
                    setNonAlcoholicIngredients(loadedNonAlcoholic);
                    setExtraIngredients(loadedExtra);
                    setPreparation(data.preparation || "");
                    setIsPublic(Boolean(data.isPublic));
                    setImageData(data.image || "");
                } else {
                    setMissing(true);
                }
            } catch (error) {
                console.error(error);
                setError("Non è stato possibile caricare il drink. Riprova.");
            } finally {
                setLoading(false);
            }
        };

        fetchDrink();
    }, [id, user]);

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

        const trimmedName = name.trim();
        const trimmedPreparation = preparation.trim();

        // stessa cosa di CreateDrink: required non basta, firestore
        // rifiuta le stringhe vuote quindi controllo prima io
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

            await updateDoc(doc(db, "drinks", id), {
                name: trimmedName,
                description: description.trim(),
                ingredients: cleanIngredients,
                preparation: trimmedPreparation,
                isPublic,
                image: imageData
            });

            navigate("/my-drinks");
        } catch (error) {
            console.error(error);
            setError("Non è stato possibile salvare le modifiche. Riprova.");
            setSaving(false);
        }
    };

    if (loading) {
        return <Loader label="Carico la ricetta" />;
    }

    if (missing) {
        return (
            <div className="shell page">
                <EmptyState title="Questo drink non esiste più">
                    <Link to="/my-drinks" className="btn btn-primary btn-hero">
                        Vai ai tuoi drink
                    </Link>
                </EmptyState>
            </div>
        );
    }

    if (forbidden) {
        return (
            <div className="shell page">
                <EmptyState
                    title="Non puoi modificare questa ricetta"
                    body="L'ha scritta qualcun altro."
                >
                    <Link to="/my-drinks" className="btn btn-primary btn-hero">
                        Vai ai tuoi drink
                    </Link>
                </EmptyState>
            </div>
        );
    }

    return (
        <div className="shell-narrow page">
            <header className="page-head">
                <div className="page-head-text">
                    <span className="eyebrow">Ricetta esistente</span>
                    <h1 className="display display-l">Modifica drink</h1>
                </div>
            </header>

            {error && (
                <div className="form-error" role="alert">
                    {error}
                </div>
            )}

            <form onSubmit={handleSubmit}>
                <div className="field">
                    <label className="field-label" htmlFor="edit-name">
                        Nome del drink
                    </label>
                    <input
                        id="edit-name"
                        className="input"
                        value={name}
                        onChange={(event) => setName(event.target.value)}
                        required
                    />
                </div>

                <div className="field">
                    <label className="field-label" htmlFor="edit-description">
                        Descrizione
                    </label>
                    <textarea
                        id="edit-description"
                        className="textarea"
                        style={{ minHeight: 90 }}
                        value={description}
                        onChange={(event) => setDescription(event.target.value)}
                        maxLength={DESCRIPTION_MAX_LENGTH}
                    />
                    <span className="field-hint">
                        {description.length}/{DESCRIPTION_MAX_LENGTH}
                    </span>
                </div>

                <div className="field">
                    <label className="field-label" htmlFor="edit-image">
                        Foto (facoltativa)
                    </label>
                    <span className="field-hint">
                        Se vuoi, aggiungi o cambia la foto del drink.
                        Non è obbligatoria.
                    </span>

                    {imageData ? (
                        <div className="image-picker">
                            <img className="image-picker-preview" src={imageData} alt="Foto del drink" />

                            <div className="image-picker-actions">
                                <label className="btn btn-outline btn-sm" htmlFor="edit-image">
                                    Cambia foto
                                </label>
                                <button
                                    type="button"
                                    className="btn btn-danger-quiet btn-sm"
                                    onClick={removeImage}
                                >
                                    Rimuovi foto
                                </button>
                            </div>

                            <input
                                id="edit-image"
                                className="visually-hidden"
                                type="file"
                                accept="image/*"
                                onChange={handleImageChange}
                            />
                        </div>
                    ) : (
                        <>
                            <input
                                id="edit-image"
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
                                    {ingredient.name && !NON_ALCOHOLIC.includes(ingredient.name) && (
                                        <option value={ingredient.name}>{ingredient.name}</option>
                                    )}
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
                    <label className="field-label" htmlFor="edit-preparation">
                        Preparazione
                    </label>
                    <textarea
                        id="edit-preparation"
                        className="textarea"
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
                            Togli la spunta per rimuoverla da Esplora
                            senza eliminarla.
                        </span>
                    </span>
                </label>

                <div className="form-actions">
                    <button type="submit" className="btn btn-success btn-hero" disabled={saving}>
                        {saving ? "Salvo..." : "Salva le modifiche"}
                    </button>
                    <Link to="/my-drinks" className="btn btn-quiet">
                        Annulla
                    </Link>
                </div>
            </form>
        </div>
    );
}

export default EditDrink;
