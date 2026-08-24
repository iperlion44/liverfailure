import { useEffect, useState } from "react";
import { Link, useNavigate } from "react-router-dom";

import { signOut } from "firebase/auth";
import { collection, getDocs, query, where } from "firebase/firestore";

import auth from "../firebase/auth";
import db from "../firebase/firestore";

import { useAuth } from "../context/useAuth";
import { readCachedFavorites } from "../utils/favoritesStorage";
import { initialOf } from "../utils/drink";
import { fetchProfilePhoto } from "../utils/userProfile";

function Profile() {
    const { user } = useAuth();
    const navigate = useNavigate();

    const [stats, setStats] = useState(null);
    const [photoURL, setPhotoURL] = useState("");
    const [error, setError] = useState("");

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
        </div>
    );
}

export default Profile;
