import { useEffect, useState } from "react";
import { Link } from "react-router-dom";

import {
    EmailAuthProvider,
    reauthenticateWithCredential,
    updatePassword,
    updateProfile
} from "firebase/auth";

import auth from "../firebase/auth";

import { useAuth } from "../context/useAuth";
import { readProfilePhoto, validateDrinkImage } from "../utils/drinkImage";
import { fetchProfilePhoto, saveProfilePhoto } from "../utils/userProfile";

function EditProfile() {
    const { user } = useAuth();

    const [name, setName] = useState(user?.displayName || "");
    const [photoData, setPhotoData] = useState("");
    const [photoLoaded, setPhotoLoaded] = useState(false);
    const [imageLoading, setImageLoading] = useState(false);

    const [currentPassword, setCurrentPassword] = useState("");
    const [newPassword, setNewPassword] = useState("");
    const [confirmNewPassword, setConfirmNewPassword] = useState("");

    const [saving, setSaving] = useState(false);
    const [error, setError] = useState("");

    useEffect(() => {
        if (!user) {
            return;
        }

        let cancelled = false;

        fetchProfilePhoto(user.uid)
            .then((saved) => {
                if (cancelled) {
                    return;
                }

                setPhotoData(saved);
                setPhotoLoaded(true);
            })
            .catch((fetchError) => console.error(fetchError));

        return () => {
            cancelled = true;
        };
    }, [user]);

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
            const dataUrl = await readProfilePhoto(file);
            setPhotoData(dataUrl);
            setPhotoLoaded(true);
        } catch (imageError) {
            console.error(imageError);
            setError("Non è stato possibile leggere l'immagine. Riprova.");
        } finally {
            setImageLoading(false);
        }
    };

    const removePhoto = () => {
        setPhotoData("");
        setPhotoLoaded(true);
    };

    const handleSubmit = async (event) => {
        event.preventDefault();
        setError("");

        const trimmedName = name.trim();

        if (!trimmedName) {
            setError("Il nome non può essere vuoto.");
            return;
        }

        const wantsPasswordChange = Boolean(newPassword || confirmNewPassword || currentPassword);

        if (wantsPasswordChange) {
            if (!currentPassword) {
                setError("Inserisci la password attuale per cambiarla.");
                return;
            }

            if (newPassword.length < 6) {
                setError("La nuova password deve contenere almeno 6 caratteri.");
                return;
            }

            if (newPassword !== confirmNewPassword) {
                setError("Le due password non coincidono.");
                return;
            }
        }

        try {
            setSaving(true);

            if (trimmedName !== user.displayName) {
                await updateProfile(auth.currentUser, { displayName: trimmedName });
            }

            // se il fetch della foto è ancora in corso (o fallito),
            // photoData è vuoto e salvare adesso cancellerebbe la
            // foto vecchia
            if (photoLoaded) {
                await saveProfilePhoto(user.uid, photoData);
            }

            if (wantsPasswordChange) {
                const credential = EmailAuthProvider.credential(user.email, currentPassword);
                await reauthenticateWithCredential(auth.currentUser, credential);
                await updatePassword(auth.currentUser, newPassword);
            }

            // ricarico tutta la pagina invece di usare il router perché
            // l'avatar nella navbar si legge solo al login
            window.location.href = "/profile";
        } catch (submitError) {
            console.error(submitError);

            if (
                submitError.code === "auth/wrong-password" ||
                submitError.code === "auth/invalid-credential"
            ) {
                setError("La password attuale non è corretta.");
            } else if (submitError.code === "auth/weak-password") {
                setError("La nuova password è troppo debole: scegline una più lunga.");
            } else if (submitError.code === "auth/requires-recent-login") {
                setError("Per motivi di sicurezza, esci e accedi di nuovo prima di cambiare la password.");
            } else {
                setError("Non è stato possibile salvare le modifiche. Controlla la connessione e riprova.");
            }
        } finally {
            setSaving(false);
        }
    };

    return (
        <div className="shell-narrow page">
            <header className="page-head">
                <div className="page-head-text">
                    <span className="eyebrow">Il tuo account</span>
                    <h1 className="display display-l">Modifica profilo</h1>
                </div>
            </header>

            {error && (
                <div className="form-error" role="alert">
                    {error}
                </div>
            )}

            <form onSubmit={handleSubmit}>
                <div className="field">
                    <label className="field-label" htmlFor="profile-image">
                        Immagine profilo
                    </label>
                    <span className="field-hint">Facoltativa.</span>

                    {photoData ? (
                        <div className="image-picker">
                            <img
                                className="image-picker-preview image-picker-preview-round"
                                src={photoData}
                                alt="Anteprima immagine profilo"
                            />

                            <div className="image-picker-actions">
                                <label className="btn btn-outline btn-sm" htmlFor="profile-image">
                                    Cambia foto
                                </label>
                                <button
                                    type="button"
                                    className="btn btn-danger-quiet btn-sm"
                                    onClick={removePhoto}
                                >
                                    Rimuovi foto
                                </button>
                            </div>

                            <input
                                id="profile-image"
                                className="visually-hidden"
                                type="file"
                                accept="image/*"
                                onChange={handleImageChange}
                            />
                        </div>
                    ) : (
                        <>
                            <input
                                id="profile-image"
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
                    <label className="field-label" htmlFor="name">
                        Nome
                    </label>
                    <input
                        id="name"
                        className="input"
                        type="text"
                        autoComplete="name"
                        value={name}
                        onChange={(event) => setName(event.target.value)}
                        required
                    />
                </div>

                <div className="field">
                    <label className="field-label" htmlFor="email">
                        Email
                    </label>
                    <input id="email" className="input" type="email" value={user?.email || ""} disabled />
                    <span className="field-hint">L'email non può essere modificata da qui.</span>
                </div>

                <div className="field">
                    <label className="field-label" htmlFor="current-password">
                        Password attuale
                    </label>
                    <span className="field-hint">Necessaria solo se vuoi cambiare la password.</span>
                    <input
                        id="current-password"
                        className="input"
                        type="password"
                        autoComplete="current-password"
                        value={currentPassword}
                        onChange={(event) => setCurrentPassword(event.target.value)}
                        placeholder="La tua password attuale"
                    />
                </div>

                <div className="field">
                    <label className="field-label" htmlFor="new-password">
                        Nuova password
                    </label>
                    <span className="field-hint">Almeno 6 caratteri. Lascia vuoto per non cambiarla.</span>
                    <input
                        id="new-password"
                        className="input"
                        type="password"
                        autoComplete="new-password"
                        value={newPassword}
                        onChange={(event) => setNewPassword(event.target.value)}
                        placeholder="Nuova password"
                    />
                </div>

                <div className="field">
                    <label className="field-label" htmlFor="confirm-new-password">
                        Conferma nuova password
                    </label>
                    <input
                        id="confirm-new-password"
                        className="input"
                        type="password"
                        autoComplete="new-password"
                        value={confirmNewPassword}
                        onChange={(event) => setConfirmNewPassword(event.target.value)}
                        placeholder="Ripeti la nuova password"
                    />
                </div>

                <div className="form-actions">
                    <button type="submit" className="btn btn-success btn-hero" disabled={saving}>
                        {saving ? "Salvo..." : "Salva modifiche"}
                    </button>
                    <Link to="/profile" className="btn btn-quiet">
                        Annulla
                    </Link>
                </div>
            </form>
        </div>
    );
}

export default EditProfile;
