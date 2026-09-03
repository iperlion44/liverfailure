import { Suspense, lazy, useState } from "react";
import { Link, NavLink } from "react-router-dom";

import { useAuth } from "../context/useAuth";
import PartyQueueAlert from "./PartyQueueAlert";
import { IconBottle, IconGlass, IconHome, IconParty, IconPlus, IconSearch, IconStar, IconUser } from "./NavIcons";

// aggiunta dell'IA: il menu utente è un componente pesante, lo carico solo se serve
// l'avatar è l'unica parte della navbar che va a leggere firestore
// (la foto profilo), quindi lo carico lazy per non tirarsi dietro
// l'SDK solo per disegnare l'header
const UserMenu = lazy(() => import("./UserMenu"));

function Navbar() {
    const { user } = useAuth();
    const [isOpen, setIsOpen] = useState(false);

    const linkClass = ({ isActive }) => (isActive ? "nav-link is-active" : "nav-link");
    const tabClass = ({ isActive }) => (isActive ? "tab-link is-active" : "tab-link");

    return (
        <>
            <header className="site-header">
                <div className="shell site-header-inner">
                    <Link to="/" className="wordmark">
                        LiverFailure
                    </Link>

                    {user && <PartyQueueAlert />}

                    <button
                        type="button"
                        className="nav-toggle"
                        aria-expanded={isOpen}
                        aria-controls="site-nav"
                        aria-label={isOpen ? "Chiudi il menu con altre voci" : "Apri il menu con altre voci"}
                        onClick={() => setIsOpen((open) => !open)}
                    >
                        <span className="nav-toggle-bars" />
                        <span className="nav-toggle-label">Menu</span>
                    </button>

                    {/* un click su un link qualsiasi richiude il menu mobile */}
                    <nav
                        id="site-nav"
                        className={isOpen ? "site-nav is-open" : "site-nav"}
                        aria-label="Navigazione principale"
                        onClick={() => setIsOpen(false)}
                    >
                        <NavLink to="/" end className={linkClass}>
                            <span className="nav-link-icon"><IconHome /></span>
                            Home
                        </NavLink>

                        <NavLink to="/explore" className={linkClass}>
                            <span className="nav-link-icon"><IconSearch /></span>
                            Esplora
                        </NavLink>

                        {user && (
                            <>
                                <NavLink to="/party" className={linkClass}>
                                    <span className="nav-link-icon"><IconParty /></span>
                                    Festa
                                </NavLink>
                                <NavLink to="/inventory" className={linkClass}>
                                    <span className="nav-link-icon"><IconBottle /></span>
                                    Dispensa
                                </NavLink>
                                <NavLink to="/my-drinks" className={linkClass}>
                                    <span className="nav-link-icon"><IconGlass /></span>
                                    I miei drink
                                </NavLink>
                                <NavLink to="/favorites" className={linkClass}>
                                    <span className="nav-link-icon"><IconStar /></span>
                                    Preferiti
                                </NavLink>
                                <NavLink to="/profile" className={({ isActive }) => `${linkClass({ isActive })} nav-link-account`}>
                                    <span className="nav-link-icon"><IconUser /></span>
                                    Profilo
                                </NavLink>
                            </>
                        )}

                        <div className="nav-actions-mobile">
                            {user ? (
                                <Link to="/create-drink" className="btn btn-primary btn-block">
                                    <IconPlus /> Crea un drink
                                </Link>
                            ) : (
                                <>
                                    <Link to="/register" className="btn btn-primary btn-block">
                                        Crea il tuo account
                                    </Link>
                                    <Link to="/login" className="btn btn-outline btn-block">
                                        Accedi
                                    </Link>
                                </>
                            )}
                        </div>
                    </nav>

                    {/* la barra in alto e' cornice, non contenuto: resta in
                        outline cosi' l'arancione dell'azione principale
                        della pagina non ha concorrenti su nessuna schermata */}
                    <div className="site-actions">
                        {user ? (
                            <>
                                <Link to="/create-drink" className="btn btn-outline btn-sm">
                                    <IconPlus /> Crea drink
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
                                <Link to="/register" className="btn btn-outline btn-sm">
                                    Registrati
                                </Link>
                            </>
                        )}
                    </div>
                </div>
            </header>

            {/* Barra fissa in basso, sempre uguale in ogni pagina: le 4-5
                destinazioni principali restano a un tocco di distanza,
                senza dover ricordarsi di aprire il menu. Stesso principio
                delle app di viaggio (Booking, Ryanair): la rotta più
                usata non si nasconde mai dietro un'icona sola. */}
            <nav className="tab-bar" aria-label="Navigazione principale rapida">
                <NavLink to="/" end className={tabClass}>
                    <span className="tab-link-icon"><IconHome /></span>
                    <span className="tab-link-label">Home</span>
                </NavLink>
                <NavLink to="/explore" className={tabClass}>
                    <span className="tab-link-icon"><IconSearch /></span>
                    <span className="tab-link-label">Esplora</span>
                </NavLink>

                {user ? (
                    <>
                        {/* Festa sta al centro perche' e' la voce che regge
                            l'uso vero dell'app: telefono in mano, in piedi,
                            serata gia' cominciata. Centro = pollice, e il
                            bollo rosso la fa trovare senza cercarla. */}
                        <NavLink to="/party" className={({ isActive }) => `${tabClass({ isActive })} tab-link-key`}>
                            <span className="tab-link-icon"><IconParty /></span>
                            <span className="tab-link-label">Festa</span>
                        </NavLink>
                        <NavLink to="/inventory" className={tabClass}>
                            <span className="tab-link-icon"><IconBottle /></span>
                            <span className="tab-link-label">Dispensa</span>
                        </NavLink>
                        <NavLink to="/profile" className={tabClass}>
                            <span className="tab-link-icon"><IconUser /></span>
                            <span className="tab-link-label">Profilo</span>
                        </NavLink>
                    </>
                ) : (
                    <>
                        <NavLink to="/login" className={tabClass}>
                            <span className="tab-link-icon"><IconUser /></span>
                            <span className="tab-link-label">Accedi</span>
                        </NavLink>
                        <NavLink to="/register" className={({ isActive }) => `${tabClass({ isActive })} tab-link-cta`}>
                            <span className="tab-link-icon"><IconPlus /></span>
                            <span className="tab-link-label">Registrati</span>
                        </NavLink>
                    </>
                )}
            </nav>
        </>
    );
}

export default Navbar;
