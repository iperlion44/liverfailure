import { useDeferredValue, useEffect, useMemo, useRef, useState } from "react";
import { Link } from "react-router-dom";

import { collection, getDocs, query, where } from "firebase/firestore";

import db from "../firebase/firestore";
import { useAuth } from "../context/useAuth";
import DrinkCard from "../components/DrinkCard";
import EmptyState from "../components/EmptyState";
import { DrinkGridSkeleton } from "../components/Loader";
import { normalizeIngredients } from "../utils/drink";
import { SPIRITS, isAlcoholic } from "../utils/spirits";

function SearchIcon() {
    return (
        <svg
            width="16"
            height="16"
            viewBox="0 0 16 16"
            fill="none"
            stroke="currentColor"
            strokeWidth="1.4"
            aria-hidden="true"
        >
            <circle cx="7" cy="7" r="4.75" />
            <path d="M10.5 10.5 L14 14" strokeLinecap="round" />
        </svg>
    );
}

function Explore() {
    const { loading: authLoading } = useAuth();

    const [drinks, setDrinks] = useState([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState("");
    const [isOffline, setIsOffline] = useState(false);
    const [search, setSearch] = useState("");
    const [selectedSpirits, setSelectedSpirits] = useState([]);
    const [analcolicoOnly, setAnalcolicoOnly] = useState(false);
    const [filterWarning, setFilterWarning] = useState("");
    const warningTimeoutRef = useRef(null);

    useEffect(() => {
        if (authLoading) {
            return;
        }

        const fetchDrinks = async () => {
            try {
                setLoading(true);
                setError("");
                setIsOffline(false);

                // qui non tengo una cache della libreria condivisa,
                // offline non c'è niente di affidabile da far vedere
                if (!navigator.onLine) {
                    throw new Error("Offline");
                }

                const querySnapshot = await getDocs(
                    query(collection(db, "drinks"), where("isPublic", "==", true))
                );

                const drinksList = querySnapshot.docs
                    .map((document) => {
                        const data = document.data();

                        return {
                            id: document.id,
                            name: data.name ?? "",
                            description: data.description ?? data.preparation ?? "",
                            ingredients: normalizeIngredients(data.ingredients),
                            preparation: data.preparation ?? "",
                            image: data.image ?? "",
                            authorName: data.authorName ?? data.authorId ?? "Sconosciuto",
                            isPublic: data.isPublic ?? true,
                            createdAt: data.createdAt ?? null
                        };
                    })
                    .filter((drink) => drink.isPublic !== false)
                    .sort((firstDrink, secondDrink) => {
                        const firstCreatedAt = firstDrink.createdAt?.toMillis?.() ?? 0;
                        const secondCreatedAt = secondDrink.createdAt?.toMillis?.() ?? 0;

                        return secondCreatedAt - firstCreatedAt;
                    });

                setDrinks(drinksList);
            } catch (error) {
                console.error(error);

                if (!navigator.onLine) {
                    setIsOffline(true);
                } else {
                    setError("Non è stato possibile caricare la libreria. Controlla la connessione e riprova.");
                }
            } finally {
                setLoading(false);
            }
        };

        fetchDrinks();
    }, [authLoading]);

    const availableSpirits = useMemo(() => {
        const present = new Set();

        drinks.forEach((drink) => {
            (drink.ingredients ?? []).forEach((ingredient) => {
                if (ingredient.name) {
                    present.add(ingredient.name);
                }
            });
        });

        return SPIRITS.filter((spirit) => present.has(spirit)).sort((a, b) =>
            a.localeCompare(b, "it")
        );
    }, [drinks]);

    useEffect(() => {
        return () => clearTimeout(warningTimeoutRef.current);
    }, []);

    const showFilterWarning = (message) => {
        clearTimeout(warningTimeoutRef.current);
        setFilterWarning(message);
        warningTimeoutRef.current = setTimeout(() => setFilterWarning(""), 4000);
    };

    const toggleSpirit = (spirit) => {
        if (analcolicoOnly) {
            showFilterWarning(
                "Non puoi combinare “Analcolico” con un alcolico: togli prima quel filtro."
            );
            return;
        }

        setFilterWarning("");
        setSelectedSpirits((previous) =>
            previous.includes(spirit)
                ? previous.filter((selected) => selected !== spirit)
                : [...previous, spirit]
        );
    };

    const toggleAnalcolico = () => {
        if (!analcolicoOnly && selectedSpirits.length > 0) {
            showFilterWarning(
                "Non puoi combinare “Analcolico” con un alcolico: togli prima gli alcolici selezionati."
            );
            return;
        }

        setFilterWarning("");
        setAnalcolicoOnly((previous) => !previous);
    };

    // uso useDeferredValue perché la griglia con tutte le foto dentro
    // non è leggera da ridisegnare, così il campo di ricerca resta
    // scattante e i risultati arrivano con un attimo di ritardo
    const deferredSearch = useDeferredValue(search);

    // senza useMemo il filtro rifà tutto il giro della libreria ad ogni
    // render, anche per cose che non c'entrano tipo il menu che si apre
    const filteredDrinks = useMemo(() => {
        const needle = deferredSearch.trim().toLowerCase();

        return drinks.filter((drink) => {
            const matchesSearch = drink.name.toLowerCase().includes(needle);

            const matchesSpirits =
                selectedSpirits.length === 0 ||
                selectedSpirits.every((spirit) =>
                    (drink.ingredients ?? []).some((ingredient) => ingredient.name === spirit)
                );

            const matchesAnalcolico =
                !analcolicoOnly ||
                !(drink.ingredients ?? []).some((ingredient) => isAlcoholic(ingredient.name));

            return matchesSearch && matchesSpirits && matchesAnalcolico;
        });
    }, [drinks, deferredSearch, selectedSpirits, analcolicoOnly]);

    return (
        <div className="shell page">
            <header className="page-head">
                <div className="page-head-text">
                    <span className="eyebrow">Libreria condivisa</span>
                    <h1 className="display display-l">Esplora</h1>
                    <p className="lede">
                        Tutti i drink resi pubblici dalla community,
                        dal più recente al più vecchio.
                    </p>
                </div>

                {!loading && !error && !isOffline && (
                    <span className="count">
                        {deferredSearch.trim() || selectedSpirits.length > 0 || analcolicoOnly
                            ? `${filteredDrinks.length} di ${drinks.length} drink`
                            : `${drinks.length} drink`}
                    </span>
                )}
            </header>

            {!isOffline && (
                <div className="search">
                    <span className="search-icon">
                        <SearchIcon />
                    </span>
                    <input
                        type="search"
                        className="search-input"
                        placeholder="Cerca per nome"
                        aria-label="Cerca un drink per nome"
                        value={search}
                        onChange={(event) => setSearch(event.target.value)}
                    />
                </div>
            )}

            {!loading && !error && !isOffline && drinks.length > 0 && (
                <>
                    <div className="spirit-filters">
                        <button
                            type="button"
                            className={analcolicoOnly ? "spirit-chip is-active" : "spirit-chip"}
                            aria-pressed={analcolicoOnly}
                            onClick={toggleAnalcolico}
                        >
                            Analcolico
                        </button>

                        {availableSpirits.map((spirit) => (
                            <button
                                key={spirit}
                                type="button"
                                className={selectedSpirits.includes(spirit) ? "spirit-chip is-active" : "spirit-chip"}
                                aria-pressed={selectedSpirits.includes(spirit)}
                                onClick={() => toggleSpirit(spirit)}
                            >
                                {spirit}
                            </button>
                        ))}
                    </div>

                    {filterWarning && (
                        <div className="notice notice-error" role="alert">
                            {filterWarning}
                        </div>
                    )}
                </>
            )}

            {loading && <DrinkGridSkeleton />}

            {!loading && isOffline && (
                <EmptyState
                    eyebrow="Sei offline"
                    title="Esplora richiede una connessione"
                    body="La libreria condivisa non è salvata sul dispositivo. Torna online per sfogliarla: nel frattempo trovi i tuoi preferiti e i tuoi drink anche offline."
                >
                    <Link to="/favorites" className="btn btn-outline">
                        Vai ai preferiti
                    </Link>
                    <Link to="/my-drinks" className="btn btn-outline">
                        Vai ai miei drink
                    </Link>
                </EmptyState>
            )}

            {!loading && !isOffline && error && (
                <div className="notice notice-error" role="alert">
                    {error}
                </div>
            )}

            {!loading && !isOffline && !error && drinks.length === 0 && (
                <EmptyState
                    eyebrow="Libreria vuota"
                    title="Non c'è ancora niente da bere"
                    body="Nessuno ha ancora pubblicato un drink. Il primo posto in libreria è libero."
                >
                    <Link to="/create-drink" className="btn btn-primary">
                        Crea il primo drink
                    </Link>
                </EmptyState>
            )}

            {!loading && !isOffline && !error && drinks.length > 0 && filteredDrinks.length === 0 && (
                <EmptyState
                    eyebrow="Nessun risultato"
                    title={
                        deferredSearch.trim()
                            ? `Niente che si chiami "${deferredSearch.trim()}"`
                            : analcolicoOnly
                            ? "Nessun drink senza alcolici"
                            : "Nessun drink con questi alcolici"
                    }
                    body="Prova con meno lettere o meno filtri, oppure scrivi tu la ricetta che stavi cercando."
                >
                    <button
                        type="button"
                        className="btn btn-outline"
                        onClick={() => {
                            setSearch("");
                            setSelectedSpirits([]);
                            setAnalcolicoOnly(false);
                            setFilterWarning("");
                        }}
                    >
                        Azzera i filtri
                    </button>
                    <Link to="/create-drink" className="btn btn-primary">
                        Crea questo drink
                    </Link>
                </EmptyState>
            )}

            {!loading && !isOffline && !error && filteredDrinks.length > 0 && (
                <div className="drink-grid">
                    {filteredDrinks.map((drink) => (
                        <Link to={`/drink/${drink.id}`} key={drink.id}>
                            <DrinkCard drink={drink} />
                        </Link>
                    ))}
                </div>
            )}
        </div>
    );
}

export default Explore;
