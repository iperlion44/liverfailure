import { Link } from "react-router-dom";

import { useAuth } from "../context/AuthContext";
import DrinkMarquee from "../components/DrinkMarquee";

function Home() {
    const { user } = useAuth();

    return (
        <>
            <DrinkMarquee />

            <section className="shell hero">
                <div className="hero-label">
                    <span className="hero-mark" />
                    <span className="eyebrow hero-eyebrow">Ricettario condiviso</span>

                    <h1 className="display display-xl hero-title">
                        Il drink si beve una volta. La ricetta resta.
                    </h1>

                    <p className="lede hero-lede">
                        Una libreria di ricette scritte da chi le beve
                        davvero. Cerca quello che ti serve, salva quello
                        che ti convince, scrivi quello che manca.
                    </p>

                    <div className="hero-actions">
                        <Link to="/explore" className="btn btn-primary">
                            Esplora i drink
                        </Link>
                        <Link to={user ? "/create-drink" : "/register"} className="btn btn-outline">
                            {user ? "Crea un drink" : "Crea il tuo account"}
                        </Link>
                    </div>

                    <div className="hero-foot">
                        <span className="eyebrow">
                            {user
                                ? `Accesso come ${user.displayName || user.email}`
                                : "Sfogliare è libero. Per pubblicare serve un account."}
                        </span>
                    </div>
                </div>
            </section>

            <div className="shell">
                <section className="tenets">
                    <article className="tenet">
                        <span className="eyebrow eyebrow-bitter">Esplora</span>
                        <h2 className="tenet-title">Prima si cerca, poi si beve</h2>
                        <p className="tenet-body">
                            Tutti i drink pubblici stanno in un unico posto,
                            con il nome di chi li ha scritti. Si cerca per
                            nome, si apre la ricetta, si beve in pace.
                        </p>
                    </article>

                    <article className="tenet">
                        <span className="eyebrow eyebrow-bitter">Scrivi</span>
                        <h2 className="tenet-title">Ingredienti pronti, gesto tuo</h2>
                        <p className="tenet-body">
                            Scegli alcolici, analcolici ed extra da liste
                            già pronte, con le quantità in ml o a occhio.
                            La preparazione la scrivi tu, a parole tue.
                        </p>
                    </article>

                    <article className="tenet">
                        <span className="eyebrow eyebrow-bitter">Porta con te</span>
                        <h2 className="tenet-title">Funziona anche offline</h2>
                        <p className="tenet-body">
                            Installa LiverFailure sul telefono: i preferiti
                            restano leggibili anche quando la connessione
                            sparisce a metà serata.
                        </p>
                    </article>
                </section>
            </div>
        </>
    );
}

export default Home;
