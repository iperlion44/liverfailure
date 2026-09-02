import { useState } from "react";
import { createUserWithEmailAndPassword, updateProfile } from "firebase/auth";
import { Link, useNavigate } from "react-router-dom";

import auth from "../firebase/auth";

function Register() {
    const navigate = useNavigate();

    const [name, setName] = useState("");
    const [email, setEmail] = useState("");
    const [password, setPassword] = useState("");
    const [confirmPassword, setConfirmPassword] = useState("");
    const [error, setError] = useState("");
    const [loading, setLoading] = useState(false);

    const handleRegister = async (event) => {
        event.preventDefault();
        setError("");

        if (name.trim() === "") {
            setError("Inserisci il tuo nome: comparirà accanto ai tuoi drink.");
            return;
        }

        if (password.length < 6) {
            setError("La password deve contenere almeno 6 caratteri.");
            return;
        }

        if (password !== confirmPassword) {
            setError("Le due password non coincidono.");
            return;
        }

        try {
            setLoading(true);

            const { user } = await createUserWithEmailAndPassword(auth, email, password);
            await updateProfile(user, { displayName: name.trim() });

            navigate("/");
        } catch (error) {
            console.error(error);

            if (error.code === "auth/email-already-in-use") {
                setError("Questa email è già registrata. Prova ad accedere.");
            } else if (error.code === "auth/invalid-email") {
                setError("Inserisci un indirizzo email valido.");
            } else if (error.code === "auth/weak-password") {
                setError("Password troppo debole: scegline una più lunga.");
            } else {
                setError("Registrazione non riuscita. Controlla la connessione e riprova.");
            }
        } finally {
            setLoading(false);
        }
    };

    return (
        <main className="auth-page">
            <div className="auth-card">
                <Link to="/" className="auth-wordmark">
                    LiverFailure
                </Link>

                <h1 className="auth-title">Crea il tuo account</h1>
                <p className="auth-sub">
                    Ti serve per pubblicare drink in libreria e
                    salvare i preferiti.
                </p>

                {error && (
                    <div className="form-error" role="alert">
                        {error}
                    </div>
                )}

                <form onSubmit={handleRegister}>
                    <div className="field">
                        <label className="field-label" htmlFor="name">
                            Nome
                        </label>
                        <span className="field-hint">
                            Compare accanto ai drink che pubblichi.
                        </span>
                        <input
                            id="name"
                            className="input"
                            type="text"
                            autoComplete="name"
                            value={name}
                            onChange={(event) => setName(event.target.value)}
                            placeholder="Come vuoi farti chiamare"
                            required
                        />
                    </div>

                    <div className="field">
                        <label className="field-label" htmlFor="email">
                            Email
                        </label>
                        <input
                            id="email"
                            className="input"
                            type="email"
                            autoComplete="email"
                            value={email}
                            onChange={(event) => setEmail(event.target.value)}
                            placeholder="nome@esempio.it"
                            required
                        />
                    </div>

                    <div className="field">
                        <label className="field-label" htmlFor="password">
                            Password
                        </label>
                        <span className="field-hint">Almeno 6 caratteri.</span>
                        <input
                            id="password"
                            className="input"
                            type="password"
                            autoComplete="new-password"
                            value={password}
                            onChange={(event) => setPassword(event.target.value)}
                            placeholder="Scegli una password"
                            required
                        />
                    </div>

                    <div className="field">
                        <label className="field-label" htmlFor="confirm-password">
                            Conferma password
                        </label>
                        <input
                            id="confirm-password"
                            className="input"
                            type="password"
                            autoComplete="new-password"
                            value={confirmPassword}
                            onChange={(event) => setConfirmPassword(event.target.value)}
                            placeholder="Ripeti la password"
                            required
                        />
                    </div>

                    <button type="submit" className="btn btn-success btn-block" disabled={loading}>
                        {loading ? "Creo l'account..." : "Crea account"}
                    </button>
                </form>

                <p className="auth-alt">
                    Hai già un account? <Link to="/login">Accedi</Link>
                </p>
            </div>

            <Link to="/" className="auth-back">
                Torna al sito
            </Link>
        </main>
    );
}

export default Register;
