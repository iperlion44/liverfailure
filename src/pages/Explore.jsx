import { useDeferredValue, useEffect, useMemo, useRef, useState } from "react";
import { Link, useSearchParams } from "react-router-dom";

import { collection, getDocs, query, where } from "firebase/firestore";

import db from "../firebase/firestore";
import { fetchAllRatings } from "../firebase/reviews";
import { useAuth } from "../context/useAuth";
import { useInventory } from "../context/useInventory";
import DrinkCard from "../components/DrinkCard";
import EmptyState from "../components/EmptyState";
import PartyPickerModal from "../components/PartyPickerModal";
import { DrinkGridSkeleton } from "../components/Loader";
import { IconPlus } from "../components/NavIcons";
import { normalizeIngredients } from "../utils/drink";
import { isMakeable, matchDrink } from "../utils/inventoryMatch";
import { bayesianRating } from "../utils/rating";
import { SPIRITS, isAlcoholic } from "../utils/spirits";
import { useFavoriteToggle } from "../utils/useFavoriteToggle";
import { usePartyPicker } from "../utils/usePartyPicker";

const SORT_RECENT = "recenti";
const SORT_RATED = "votati";
const SORT_MAKEABLE = "fattibili";

// niente da salvare per sempre: bastano i filtri di questa scheda,
// così tornando da un drink li ritrovo com'erano
const FILTERS_STORAGE_KEY = "explore-filters";

function readStoredFilters() {
    try {
        const raw = sessionStorage.getItem(FILTERS_STORAGE_KEY);

        return raw ? JSON.parse(raw) : null;
    } catch (error) {
        console.error("Errore lettura filtri esplora:", error);
        return null;
    }
}

function writeStoredFilters(filters) {
    try {
        sessionStorage.setItem(FILTERS_STORAGE_KEY, JSON.stringify(filters));
    } catch (error) {
        console.error("Errore salvataggio filtri esplora:", error);
    }
}

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

function FilterIcon() {
    return (
        <svg
            width="14"
            height="14"
            viewBox="0 0 16 16"
            fill="none"
            stroke="currentColor"
            strokeWidth="1.4"
            aria-hidden="true"
        >
            <path d="M2 3.5h12M4.5 8h7M7 12.5h2" strokeLinecap="round" />
        </svg>
    );
}

function Explore() {
    const { user, loading: authLoading } = useAuth();
    const { inventory, inventorySet } = useInventory();
    const party = usePartyPicker();
    const { favoriteActionFor } = useFavoriteToggle(user);

    // la ricerca della home passa il termine nell'URL (?q=...): al primo
    // arrivo qui vince quella, altrimenti si riparte da dove si era
    // rimasti nella scheda (i filtri salvati in sessionStorage)
    const [searchParams, setSearchParams] = useSearchParams();
    const consumedQueryRef = useRef(false);

    const [drinks, setDrinks] = useState([]);
    const [ratings, setRatings] = useState({});
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState("");
    const [isOffline, setIsOffline] = useState(false);
    const [search, setSearch] = useState(() => searchParams.get("q") ?? readStoredFilters()?.search ?? "");
    const [selectedSpirits, setSelectedSpirits] = useState(
        () => readStoredFilters()?.selectedSpirits ?? []
    );
    const [analcolicoOnly, setAnalcolicoOnly] = useState(
        () => readStoredFilters()?.analcolicoOnly ?? false
    );
    const [makeableOnly, setMakeableOnly] = useState(
        () => readStoredFilters()?.makeableOnly ?? false
    );
    const [sort, setSort] = useState(() => readStoredFilters()?.sort ?? SORT_RECENT);
    const [showFilterPanel, setShowFilterPanel] = useState(false);
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

                // le medie stanno in una collection a parte: una lettura
                // sola per tutta la libreria, così posso ordinare per
                // voto senza aprire ogni ricetta
                const [querySnapshot, allRatings] = await Promise.all([
                    getDocs(query(collection(db, "drinks"), where("isPublic", "==", true))),
                    fetchAllRatings().catch((ratingError) => {
                        console.error(ratingError);
                        return {};
                    })
                ]);

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
                setRatings(allRatings);
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

    // tolgo ?q= dall'URL una volta letto: da qui in poi il campo di
    // ricerca è la fonte di verità, non l'indirizzo
    useEffect(() => {
        if (consumedQueryRef.current) {
            return;
        }

        consumedQueryRef.current = true;

        if (searchParams.get("q")) {
            setSearchParams({}, { replace: true });
        }
    }, [searchParams, setSearchParams]);

    useEffect(() => {
        writeStoredFilters({ search, selectedSpirits, analcolicoOnly, makeableOnly, sort });
    }, [search, selectedSpirits, analcolicoOnly, makeableOnly, sort]);

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

    const selectMakeableSort = () => {
        if (inventory.length === 0) {
            showFilterWarning(
                "La tua dispensa è vuota: aggiungi qualche bottiglia prima di ordinare per “Già fattibili”."
            );
            return;
        }

        setFilterWarning("");
        setSort(SORT_MAKEABLE);
    };

    // uso useDeferredValue perché la griglia con tutte le foto dentro
    // non è leggera da ridisegnare, così il campo di ricerca resta
    // scattante e i risultati arrivano con un attimo di ritardo
    const deferredSearch = useDeferredValue(search);

    // il confronto con la dispensa lo calcolo una volta sola e me lo
    // porto dietro: serve sia al filtro che al badge sulla card
    const drinksWithMatch = useMemo(
        () =>
            drinks.map((drink) => ({
                ...drink,
                match: matchDrink(drink.ingredients, inventorySet)
            })),
        [drinks, inventorySet]
    );

    // senza useMemo il filtro rifà tutto il giro della libreria ad ogni
    // render, anche per cose che non c'entrano tipo il menu che si apre
    const filteredDrinks = useMemo(() => {
        const needle = deferredSearch.trim().toLowerCase();

        return drinksWithMatch.filter((drink) => {
            const matchesSearch = drink.name.toLowerCase().includes(needle);

            const matchesSpirits =
                selectedSpirits.length === 0 ||
                selectedSpirits.every((spirit) =>
                    (drink.ingredients ?? []).some((ingredient) => ingredient.name === spirit)
                );

            const matchesAnalcolico =
                !analcolicoOnly ||
                !(drink.ingredients ?? []).some((ingredient) => isAlcoholic(ingredient.name));

            const matchesPantry = !makeableOnly || isMakeable(drink.match);

            return matchesSearch && matchesSpirits && matchesAnalcolico && matchesPantry;
        });
    }, [drinksWithMatch, deferredSearch, selectedSpirits, analcolicoOnly, makeableOnly]);

    const sortedDrinks = useMemo(() => {
        if (sort === SORT_MAKEABLE) {
            // meno ingredienti mancano, più in alto: chi è già pronto
            // (0 mancanti) sta in cima
            return [...filteredDrinks].sort(
                (firstDrink, secondDrink) => firstDrink.match.missingCount - secondDrink.match.missingCount
            );
        }

        if (sort !== SORT_RATED) {
            return filteredDrinks;
        }

        // ordino sulla media bayesiana: un solo 5 stelle non deve
        // scavalcare chi ha venti voti alti
        return [...filteredDrinks].sort((firstDrink, secondDrink) => {
            const firstScore = bayesianRating(ratings[firstDrink.id]);
            const secondScore = bayesianRating(ratings[secondDrink.id]);

            if (firstScore !== secondScore) {
                return secondScore - firstScore;
            }

            return (
                (ratings[secondDrink.id]?.ratingCount ?? 0) -
                (ratings[firstDrink.id]?.ratingCount ?? 0)
            );
        });
    }, [filteredDrinks, ratings, sort]);

    const activeFilterCount =
        selectedSpirits.length + (analcolicoOnly ? 1 : 0) + (makeableOnly ? 1 : 0);

    return (
        <div className="shell page">
            <header className="page-head">
                <div className="page-head-text">
                    <h1 className="display display-l">Esplora</h1>
                </div>

                {!loading && !error && !isOffline && (
                    <span className="count">
                        {deferredSearch.trim() ||
                        selectedSpirits.length > 0 ||
                        analcolicoOnly ||
                        makeableOnly
                            ? `${filteredDrinks.length} di ${drinks.length} drink`
                            : `${drinks.length} drink`}
                    </span>
                )}
            </header>

            {party.partyNotice && (
                <div className="notice" role="status">
                    {party.partyNotice.text} <Link to={`/party/${party.partyNotice.code}`}>Vai alla festa</Link>.
                </div>
            )}

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
                    <div className="explore-tools">
                        <div className="sort-switch" role="group" aria-label="Ordina la libreria">
                            <button
                                type="button"
                                className={sort === SORT_RECENT ? "sort-option is-active" : "sort-option"}
                                aria-pressed={sort === SORT_RECENT}
                                onClick={() => setSort(SORT_RECENT)}
                            >
                                Più recenti
                            </button>
                            <button
                                type="button"
                                className={sort === SORT_RATED ? "sort-option is-active" : "sort-option"}
                                aria-pressed={sort === SORT_RATED}
                                onClick={() => setSort(SORT_RATED)}
                            >
                                Più votati
                            </button>
                            <button
                                type="button"
                                className={sort === SORT_MAKEABLE ? "sort-option is-active" : "sort-option"}
                                aria-pressed={sort === SORT_MAKEABLE}
                                onClick={selectMakeableSort}
                            >
                                Già fattibili
                            </button>
                        </div>

                        <button
                            type="button"
                            className={showFilterPanel ? "filter-toggle is-active" : "filter-toggle"}
                            aria-pressed={showFilterPanel}
                            aria-expanded={showFilterPanel}
                            onClick={() => setShowFilterPanel((previous) => !previous)}
                        >
                            <FilterIcon />
                            Filtri
                            {activeFilterCount > 0 && (
                                <span className="filter-toggle-count">{activeFilterCount}</span>
                            )}
                        </button>
                    </div>

                    {showFilterPanel && (
                        <div className="spirit-filters">
                            {inventory.length > 0 && (
                                <button
                                    type="button"
                                    className={makeableOnly ? "spirit-chip is-active" : "spirit-chip"}
                                    aria-pressed={makeableOnly}
                                    onClick={() => setMakeableOnly((previous) => !previous)}
                                >
                                    Solo quello che posso fare
                                </button>
                            )}

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
                    )}

                    {filterWarning && (
                        <div className="notice notice-error" role="alert">
                            {filterWarning}
                        </div>
                    )}
                </>
            )}

            {loading && <DrinkGridSkeleton />}

            {!loading && isOffline && (
                <EmptyState title="Esplora ha bisogno di connessione">
                    <Link to="/favorites" className="btn btn-primary btn-hero">
                        Preferiti
                    </Link>
                    <Link to="/my-drinks" className="btn btn-outline btn-hero">
                        I miei drink
                    </Link>
                </EmptyState>
            )}

            {!loading && !isOffline && error && (
                <div className="notice notice-error" role="alert">
                    {error}
                </div>
            )}

            {!loading && !isOffline && !error && drinks.length === 0 && (
                <EmptyState title="Non c'è ancora niente da bere">
                    <Link to="/create-drink" className="btn btn-primary btn-hero">
                        <IconPlus />
                        Crea il primo drink
                    </Link>
                </EmptyState>
            )}

            {!loading && !isOffline && !error && drinks.length > 0 && filteredDrinks.length === 0 && (
                <EmptyState
                    title={
                        deferredSearch.trim()
                            ? `Niente che si chiami "${deferredSearch.trim()}"`
                            : makeableOnly
                            ? "Con questa dispensa non esce niente"
                            : analcolicoOnly
                            ? "Nessun drink senza alcolici"
                            : "Nessun drink con questi alcolici"
                    }
                >
                    <button
                        type="button"
                        className="btn btn-primary btn-hero"
                        onClick={() => {
                            setSearch("");
                            setSelectedSpirits([]);
                            setAnalcolicoOnly(false);
                            setMakeableOnly(false);
                            setFilterWarning("");
                        }}
                    >
                        Azzera i filtri
                    </button>
                    <Link to="/create-drink" className="btn btn-outline btn-hero">
                        Crea questo drink
                    </Link>
                </EmptyState>
            )}

            {!loading && !isOffline && !error && sortedDrinks.length > 0 && (
                <div className="drink-grid">
                    {sortedDrinks.map((drink) => (
                        <Link to={`/drink/${drink.id}`} key={drink.id}>
                            <DrinkCard
                                drink={drink}
                                rating={ratings[drink.id]}
                                match={drink.match}
                                partyAction={party.partyActionFor(drink, user)}
                                favoriteAction={favoriteActionFor(drink)}
                            />
                        </Link>
                    ))}
                </div>
            )}

            {party.pickerDrink && (
                <PartyPickerModal
                    drink={party.pickerDrink}
                    parties={party.openParties}
                    pendingPartyId={party.pendingPartyId}
                    creating={party.creatingParty}
                    error={party.partyListError}
                    onToggleParty={party.handleToggleParty}
                    onCreateParty={party.handleCreateParty}
                    onClose={() => party.setPickerDrink(null)}
                />
            )}
        </div>
    );
}

export default Explore;
