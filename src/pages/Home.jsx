import { Suspense, lazy, useState } from "react";
import { Link, useNavigate } from "react-router-dom";

import { useAuth } from "../context/useAuth";
import { useMediaQuery } from "../utils/useMediaQuery";
import { IconBottle, IconGlass, IconParty, IconSearch, IconStar } from "../components/NavIcons";

//consiglio dell'AI:
// le colonne con le foto sono solo decorative ma leggono da firestore,
// quindi le carico in lazy per non appesantire il bundle della home
const DrinkMarquee = lazy(() => import("../components/DrinkMarquee"));

// i consigli servono solo a chi è loggato e leggono mezza libreria:
// fuori dal bundle della home, che deve restare leggera per chi arriva
// da fuori senza account
const Recommendations = lazy(() => import("../components/Recommendations"));

//consiglio dell'AI:
// stessa soglia di .marquee in styles/parts/10-home-colonne-drink.css.
// sotto questa larghezza il
// CSS le nasconde comunque quindi non ha senso nemmeno montarle
const MARQUEE_BREAKPOINT = "(min-width: 1380px)";

const SHORTCUTS = [
    { to: "/inventory", icon: IconBottle, title: "Dispensa" },
    { to: "/party", icon: IconParty, title: "Festa" },
    { to: "/my-drinks", icon: IconGlass, title: "I miei drink" },
    { to: "/favorites", icon: IconStar, title: "Preferiti" }
];

function Home() {
    const { user } = useAuth();
    const navigate = useNavigate();
    const showsMarquee = useMediaQuery(MARQUEE_BREAKPOINT);
    const [heroSearch, setHeroSearch] = useState("");

    const handleHeroSearch = (event) => {
        event.preventDefault();
        const query = heroSearch.trim();
        navigate(query ? `/explore?q=${encodeURIComponent(query)}` : "/explore");
    };

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

                    <h1 className="display display-xl hero-title">
                        Il tuo cocktail bar
                    </h1>

                    <form className="hero-search" onSubmit={handleHeroSearch} role="search">
                        <span className="visually-hidden" id="hero-search-label">
                            Cerca un drink per nome
                        </span>
                        <span className="hero-search-field">
                            <span className="hero-search-icon" aria-hidden="true">
                                <IconSearch />
                            </span>
                            <input
                                type="search"
                                className="hero-search-input"
                                aria-labelledby="hero-search-label"
                                placeholder="Cerca un drink, es. Negroni"
                                value={heroSearch}
                                onChange={(event) => setHeroSearch(event.target.value)}
                            />
                        </span>
                        <button type="submit" className="btn btn-primary hero-search-btn">
                            Cerca
                        </button>
                    </form>

                    <span className="hero-or">oppure</span>

                    <div className="hero-actions">
                        <Link to="/explore" className="btn btn-outline btn-hero">
                            Sfoglia tutto
                        </Link>
                        <Link
                            to={user ? "/create-drink" : "/register"}
                            className="btn btn-outline btn-hero"
                        >
                            {user ? "Crea un drink" : "Crea l'account"}
                        </Link>
                    </div>
                </div>
            </section>

            {user && (
                <div className="shell home-section">
                    <nav className="shortcuts" aria-label="Le tue funzioni">
                        {SHORTCUTS.map(({ to, icon: Icon, title }) => (
                            <Link to={to} className="shortcut" key={to}>
                                <span className="shortcut-icon" aria-hidden="true">
                                    <Icon />
                                </span>
                                <span className="shortcut-title">{title}</span>
                            </Link>
                        ))}
                    </nav>
                </div>
            )}

            {user && (
                <Suspense fallback={null}>
                    <Recommendations />
                </Suspense>
            )}
        </>
    );
}

export default Home;
