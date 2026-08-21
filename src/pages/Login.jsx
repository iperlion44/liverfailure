import { useState } from "react";
import { signInWithEmailAndPassword } from "firebase/auth";
import { Link, useNavigate } from "react-router-dom";

import auth from "../firebase/auth";

function Login() {
    const navigate = useNavigate();

    const [email, setEmail] = useState("");
    const [password, setPassword] = useState("");
    const [error, setError] = useState("");
    const [loading, setLoading] = useState(false);

    const handleLogin = async (event) => {
        event.preventDefault();
        setError("");

        try {
            setLoading(true);
            await signInWithEmailAndPassword(auth, email, password);
            navigate("/");
        } catch (error) {
            console.error(error);

            if (
                error.code === "auth/invalid-credential" ||
                error.code === "auth/wrong-password" ||
                error.code === "auth/user-not-found"
            ) {
                setError("Email o password non corretti.");
            } else if (error.code === "auth/invalid-email") {
                setError("Inserisci un indirizzo email valido.");
            } else if (error.code === "auth/too-many-requests") {
                setError("Troppi tentativi. Aspetta qualche minuto e riprova.");
            } else {
                setError("Accesso non riuscito. Controlla la connessione e riprova.");
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

                <h1 className="auth-title">Bentornato</h1>
                <p className="auth-sub">
                    Accedi per scrivere i tuoi drink e ritrovare
                    i preferiti.
                </p>

                {error && (
                    <div className="form-error" role="alert">
                        {error}
                    </div>
                )}

                <form onSubmit={handleLogin}>
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
                        <input
                            id="password"
                            className="input"
                            type="password"
                            autoComplete="current-password"
                            value={password}
                            onChange={(event) => setPassword(event.target.value)}
                            placeholder="La tua password"
                            required
                        />
                    </div>

                    <button type="submit" className="btn btn-primary btn-block" disabled={loading}>
                        {loading ? "Accedo..." : "Accedi"}
                    </button>
                </form>

                <p className="auth-alt">
                    Non hai ancora un account? <Link to="/register">Registrati</Link>
                </p>
            </div>

            <Link to="/" className="auth-back">
                Torna al sito
            </Link>
        </main>
    );
}

export default Login;
