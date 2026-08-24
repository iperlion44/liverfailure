import { useEffect, useState } from "react";
import { Link, useNavigate } from "react-router-dom";

import {
    EmailAuthProvider,
    deleteUser,
    reauthenticateWithCredential,
    signOut
} from "firebase/auth";
import { collection, deleteDoc, doc, getDocs, query, where } from "firebase/firestore";

import auth from "../firebase/auth";
import db from "../firebase/firestore";

import { useAuth } from "../context/useAuth";
import { getFavoritesCacheKey, readCachedFavorites } from "../utils/favoritesStorage";
import { getMyDrinksCacheKey } from "../utils/myDrinksStorage";
import { initialOf } from "../utils/drink";
import { fetchProfilePhoto } from "../utils/userProfile";

function Profile() {
    const { user } = useAuth();
    const navigate = useNavigate();

    const [stats, setStats] = useState(null);
    const [photoURL, setPhotoURL] = useState("");
    const [error, setError] = useState("");

    const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
    const [deletePassword, setDeletePassword] = useState("");
    const [deleting, setDeleting] = useState(false);
    const [deleteError, setDeleteError] = useState("");

    useEffect(() => {
        const fetchStats = async () => {
            if (!user) {
                return;
            }

            const favoriteCount = readCachedFavorites(user.uid).length;

            try {
                const snapshot = await getDocs(
                    query(collection(db, "drinks"), where("authorId", "==", user.uid))
                );

                const written = snapshot.docs.length;
                const published = snapshot.docs.filter(
                    (document) => document.data().isPublic
                ).length;

                setStats({ written, published, favoriteCount });
            } catch (error) {
                console.error(error);
                setError("Non è stato possibile leggere i tuoi numeri. Riprova più tardi.");
                setStats({ written: null, published: null, favoriteCount });
            }
        };

        fetchStats();
    }, [user]);

    useEffect(() => {
        if (!user) {
            return;
        }

        fetchProfilePhoto(user.uid)
            .then(setPhotoURL)
            .catch((photoError) => console.error(photoError));
    }, [user]);

    const handleLogout = async () => {
        try {
            await signOut(auth);
            navigate("/");
        } catch (error) {
            console.error(error);
            setError("Non è stato possibile uscire. Riprova.");
        }
    };

    const handleDeleteAccount = async (event) => {
        event.preventDefault();
        setDeleteError("");

        if (!deletePassword) {
            setDeleteError("Inserisci la password per confermare.");
            return;
        }

        // doppia conferma: il form da solo è troppo facile da inviare per
        // sbaglio con un click, qui serve un secondo sì esplicito
        const confirmed = window.confirm(
            "Eliminare definitivamente il profilo? I tuoi drink e preferiti verranno cancellati e l'azione non si può annullare."
        );

        if (!confirmed) {
            return;
        }

        try {
            setDeleting(true);

            // firebase rifiuta deleteUser se il login non è "recente", per
            // questo chiedo di nuovo la password invece di eliminare e basta
            const credential = EmailAuthProvider.credential(user.email, deletePassword);
            await reauthenticateWithCredential(auth.currentUser, credential);

            // cancello prima tutto quello che sta su firestore e solo alla
            // fine l'utente auth: le regole di sicurezza si basano su
            // request.auth, se elimino l'utente prima questi delete
            // verrebbero rifiutati
            const drinksSnapshot = await getDocs(
                query(collection(db, "drinks"), where("authorId", "==", user.uid))
            );
            await Promise.all(drinksSnapshot.docs.map((document) => deleteDoc(document.ref)));

            const favoritesSnapshot = await getDocs(collection(db, "users", user.uid, "favorites"));
            await Promise.all(favoritesSnapshot.docs.map((document) => deleteDoc(document.ref)));

            await deleteDoc(doc(db, "users", user.uid));

            // altrimenti il prossimo che apre l'app da questo browser si
            // ritrova in cache i drink/preferiti di un account cancellato
            localStorage.removeItem(getFavoritesCacheKey(user.uid));
            localStorage.removeItem(getMyDrinksCacheKey(user.uid));

            await deleteUser(auth.currentUser);

            navigate("/");
        } catch (error) {
            console.error(error);

            if (error.code === "auth/wrong-password" || error.code === "auth/invalid-credential") {
                setDeleteError("La password non è corretta.");
            } else if (error.code === "auth/requires-recent-login") {
                setDeleteError("Per motivi di sicurezza, esci e accedi di nuovo prima di eliminare il profilo.");
            } else {
                setDeleteError("Non è stato possibile eliminare il profilo. Riprova.");
            }
        } finally {
            setDeleting(false);
        }
    };

    return (
        <div className="shell-narrow page">
            <header className="page-head">
                <div className="page-head-text">
                    <span className="eyebrow">Il tuo account</span>
                    <h1 className="display display-l">Profilo</h1>
                </div>
            </header>

            {error && (
                <div className="notice notice-error" role="alert">
                    {error}
                </div>
            )}

            <section className="profile-card">
                {photoURL ? (
                    <span className="avatar">
                        <img className="avatar-photo" src={photoURL} alt="" />
                    </span>
                ) : (
                    <span className="avatar" aria-hidden="true">
                        {initialOf(user)}
                    </span>
                )}

                <div className="profile-info">
                    <p className="profile-name">{user?.displayName || "Senza nome"}</p>
                    <p className="profile-email">{user?.email}</p>
                </div>
            </section>

            <section className="stat-row">
                <div className="stat">
                    <p className="stat-value">{stats ? (stats.written ?? "—") : "—"}</p>
                    <span className="eyebrow">Drink scritti</span>
                </div>

                <div className="stat">
                    <p className="stat-value">{stats ? (stats.published ?? "—") : "—"}</p>
                    <span className="eyebrow">In libreria</span>
                </div>

                <div className="stat">
                    <p className="stat-value">{stats ? stats.favoriteCount : "—"}</p>
                    <span className="eyebrow">Preferiti</span>
                </div>
            </section>

            <div className="form-actions">
                <Link to="/profile/edit" className="btn btn-primary">
                    Modifica profilo
                </Link>
                <Link to="/my-drinks" className="btn btn-outline">
                    Gestisci i tuoi drink
                </Link>
                <button type="button" className="btn btn-danger-quiet" onClick={handleLogout}>
                    Esci
                </button>
            </div>

            <section className="danger-zone">
                <span className="eyebrow">Eliminazione</span>

                {!showDeleteConfirm ? (
                    <div className="form-actions">
                        <button
                            type="button"
                            className="btn btn-danger-quiet"
                            onClick={() => setShowDeleteConfirm(true)}
                        >
                            Elimina profilo
                        </button>
                    </div>
                ) : (
                    <form onSubmit={handleDeleteAccount}>
                        <p className="field-hint">
                            Questa azione cancella il tuo account, i drink che hai scritto e i preferiti.
                            Non si può annullare. Conferma con la tua password.
                        </p>

                        {deleteError && (
                            <div className="form-error" role="alert">
                                {deleteError}
                            </div>
                        )}

                        <div className="field">
                            <label className="field-label" htmlFor="delete-password">
                                Password
                            </label>
                            <input
                                id="delete-password"
                                className="input"
                                type="password"
                                autoComplete="current-password"
                                value={deletePassword}
                                onChange={(event) => setDeletePassword(event.target.value)}
                                placeholder="La tua password"
                            />
                        </div>

                        <div className="form-actions">
                            <button type="submit" className="btn btn-danger-quiet" disabled={deleting}>
                                {deleting ? "Elimino..." : "Conferma eliminazione"}
                            </button>
                            <button
                                type="button"
                                className="btn btn-outline"
                                onClick={() => {
                                    setShowDeleteConfirm(false);
                                    setDeletePassword("");
                                    setDeleteError("");
                                }}
                                disabled={deleting}
                            >
                                Annulla
                            </button>
                        </div>
                    </form>
                )}
            </section>
        </div>
    );
}

export default Profile;
