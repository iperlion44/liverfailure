import { Suspense, lazy, useState } from "react";
import { Link, NavLink } from "react-router-dom";

import { useAuth } from "../context/useAuth";

// aggiunta dell'IA: il menu utente è un componente pesante, lo carico solo se serve
// l'avatar è l'unica parte della navbar che va a leggere firestore
// (la foto profilo), quindi lo carico lazy per non tirarsi dietro
// l'SDK solo per disegnare l'header
const UserMenu = lazy(() => import("./UserMenu"));

function Navbar() {
    const { user } = useAuth();
    const [isOpen, setIsOpen] = useState(false);

    const linkClass = ({ isActive }) => (isActive ? "nav-link is-active" : "nav-link");

    return (
        <header className="site-header">
            <div className="shell site-header-inner">
                <Link to="/" className="wordmark">
                    LiverFailure
                </Link>

                <button
                    type="button"
                    className="nav-toggle"
                    aria-expanded={isOpen}
                    aria-controls="site-nav"
                    aria-label={isOpen ? "Chiudi il menu" : "Apri il menu"}
                    onClick={() => setIsOpen((open) => !open)}
                >
                    <span className="nav-toggle-bars" />
                </button>

                {/* un click su un link qualsiasi richiude il menu mobile */}
                <nav
                    id="site-nav"
                    className={isOpen ? "site-nav is-open" : "site-nav"}
                    aria-label="Navigazione principale"
                    onClick={() => setIsOpen(false)}
                >
                    <NavLink to="/explore" className={linkClass}>
                        Esplora
                    </NavLink>

                    {user && (
                        <>
                            <NavLink to="/my-drinks" className={linkClass}>
                                I miei drink
                            </NavLink>
                            <NavLink to="/favorites" className={linkClass}>
                                Preferiti
                            </NavLink>
                            <NavLink to="/profile" className={linkClass}>
                                Profilo
                            </NavLink>
                        </>
                    )}

                    <div className="nav-actions-mobile">
                        {user ? (
                            <Link to="/create-drink" className="btn btn-primary btn-block">
                                Crea drink
                            </Link>
                        ) : (
                            <>
                                <Link to="/login" className="btn btn-outline btn-block">
                                    Accedi
                                </Link>
                                <Link to="/register" className="btn btn-primary btn-block">
                                    Registrati
                                </Link>
                            </>
                        )}
                    </div>
                </nav>

                <div className="site-actions">
                    {user ? (
                        <>
                            <Link to="/create-drink" className="btn btn-primary btn-sm">
                                Crea drink
                            </Link>

                            {/* placeholder della stessa dimensione dell'avatar, così
                                quando arriva non fa saltare il layout */}
                            <Suspense fallback={<span className="avatar avatar-sm" aria-hidden="true" />}>
                                <UserMenu />
                            </Suspense>
                        </>
                    ) : (
                        <>
                            <Link to="/login" className="btn btn-quiet btn-sm">
                                Accedi
                            </Link>
                            <Link to="/register" className="btn btn-primary btn-sm">
                                Registrati
                            </Link>
                        </>
                    )}
                </div>
            </div>
        </header>
    );
}

export default Navbar;
