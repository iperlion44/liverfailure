import { Suspense, lazy } from "react";
import { Link } from "react-router-dom";

import { useAuth } from "../context/useAuth";
import { useMediaQuery } from "../utils/useMediaQuery";

// le colonne con le foto sono solo decorative ma leggono da firestore,
// quindi le carico in lazy per non appesantire il bundle della home
const DrinkMarquee = lazy(() => import("../components/DrinkMarquee"));

// stessa soglia di .marquee in global.css. sotto questa larghezza il
// CSS le nasconde comunque quindi non ha senso nemmeno montarle
const MARQUEE_BREAKPOINT = "(min-width: 1500px)";

function Home() {
    const { user } = useAuth();
    const showsMarquee = useMediaQuery(MARQUEE_BREAKPOINT);

    return (
        <>
            {showsMarquee && (
                <Suspense fallback={null}>
                    <DrinkMarquee />
                </Suspense>
            )}

            <section className="shell hero">
                <div className="hero-label">
                    <span className="hero-mark" />
                    <span className="eyebrow hero-eyebrow">Ricettario condiviso</span>

                    <h1 className="display display-xl hero-title">
                        Le ricette dei drink che prepariamo davvero
                    </h1>

                    <p className="lede hero-lede">
                        Una raccolta di ricette scritte da chi i drink
                        li beve per davvero. Cerca quella che ti serve,
                        o aggiungi quella che manca.
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
                                : "Puoi sfogliare senza account. Per pubblicare invece serve registrarsi."}
                        </span>
                    </div>
                </div>
            </section>

            <div className="shell">
                <section className="tenets">
                    <article className="tenet">
                        <span className="eyebrow eyebrow-bitter">Esplora</span>
                        <h2 className="tenet-title">Cerca la ricetta giusta</h2>
                        <p className="tenet-body">
                            Tutti i drink pubblici sono in un unico posto,
                            con il nome di chi li ha scritti. Cerca per
                            nome e apri la ricetta.
                        </p>
                    </article>

                    <article className="tenet">
                        <span className="eyebrow eyebrow-bitter">Scrivi</span>
                        <h2 className="tenet-title">Componi la ricetta</h2>
                        <p className="tenet-body">
                            Scegli alcolici, analcolici ed extra da liste
                            già pronte, con le quantità in ml o a occhio,
                            e scrivi tu la preparazione.
                        </p>
                    </article>

                    <article className="tenet">
                        <span className="eyebrow eyebrow-bitter">Porta con te</span>
                        <h2 className="tenet-title">Funziona anche offline</h2>
                        <p className="tenet-body">
                            Installa LiverFailure sul telefono: i tuoi
                            preferiti restano leggibili anche se la
                            connessione salta a metà serata.
                        </p>
                    </article>
                </section>
            </div>
        </>
    );
}

export default Home;
