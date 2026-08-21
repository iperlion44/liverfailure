import { useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";

import { collection, getDocs, query, where } from "firebase/firestore";

import db from "../firebase/firestore";
import { useAuth } from "../context/AuthContext";
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
    const [search, setSearch] = useState("");
    const [selectedSpirits, setSelectedSpirits] = useState([]);
    const [analcolicoOnly, setAnalcolicoOnly] = useState(false);

    useEffect(() => {
        if (authLoading) {
            return;
        }

        const fetchDrinks = async () => {
            try {
                setLoading(true);
                setError("");

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
                setError("Non è stato possibile caricare la libreria. Controlla la connessione e riprova.");
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

        return SPIRITS.filter((spirit) => present.has(spirit));
    }, [drinks]);

    const toggleSpirit = (spirit) => {
        setSelectedSpirits((previous) =>
            previous.includes(spirit)
                ? previous.filter((selected) => selected !== spirit)
                : [...previous, spirit]
        );
    };

    const filteredDrinks = drinks.filter((drink) => {
        const matchesSearch = drink.name.toLowerCase().includes(search.trim().toLowerCase());

        const matchesSpirits =
            selectedSpirits.length === 0 ||
            selectedSpirits.some((spirit) =>
                (drink.ingredients ?? []).some((ingredient) => ingredient.name === spirit)
            );

        const matchesAnalcolico =
            !analcolicoOnly || !(drink.ingredients ?? []).some((ingredient) => isAlcoholic(ingredient.name));

        return matchesSearch && matchesSpirits && matchesAnalcolico;
    });

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

                {!loading && !error && (
                    <span className="count">
                        {search.trim() || selectedSpirits.length > 0 || analcolicoOnly
                            ? `${filteredDrinks.length} di ${drinks.length} drink`
                            : `${drinks.length} drink`}
                    </span>
                )}
            </header>

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

            {!loading && !error && drinks.length > 0 && (
                <div className="spirit-filters">
                    <button
                        type="button"
                        className={analcolicoOnly ? "spirit-chip is-active" : "spirit-chip"}
                        aria-pressed={analcolicoOnly}
                        onClick={() => setAnalcolicoOnly((previous) => !previous)}
                    >
                        Analcolico
                    </button>

                    {availableSpirits.map((spirit) => (
                        <button
                            key={spirit}
                            type="button"
                            className={selectedSpirits.includes(spirit) ? "spirit-chip is-active" : "spirit-chip"}
                            onClick={() => toggleSpirit(spirit)}
                        >
                            {spirit}
                        </button>
                    ))}
                </div>
            )}

            {loading && <DrinkGridSkeleton />}

            {!loading && error && (
                <div className="notice notice-error" role="alert">
                    {error}
                </div>
            )}

            {!loading && !error && drinks.length === 0 && (
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

            {!loading && !error && drinks.length > 0 && filteredDrinks.length === 0 && (
                <EmptyState
                    eyebrow="Nessun risultato"
                    title={
                        search.trim()
                            ? `Niente che si chiami "${search.trim()}"`
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
                        }}
                    >
                        Azzera i filtri
                    </button>
                    <Link to="/create-drink" className="btn btn-primary">
                        Crea questo drink
                    </Link>
                </EmptyState>
            )}

            {!loading && !error && filteredDrinks.length > 0 && (
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
