import { useEffect, useMemo, useState } from "react";
import { Link, useNavigate } from "react-router-dom";

import {
    PARTY_NAME_MAX_LENGTH,
    PartyError,
    createParty,
    deleteParty,
    fetchParty,
    joinParty,
    listMyParties
} from "../firebase/party";
import { useAuth } from "../context/useAuth";
import { useInventory } from "../context/useInventory";
import { usePartyList } from "../context/usePartyList";
import { formatPartyCode, isValidPartyCode, normalizePartyCode } from "../utils/partyCode";
import { forgetParty, readRememberedParties, rememberParty } from "../utils/partyStorage";

function Party() {
    const { user } = useAuth();
    const { inventory, loading: pantryLoading } = useInventory();
    const { refresh: refreshPartyList } = usePartyList();
    const navigate = useNavigate();

    const [name, setName] = useState("");
    const [usePantry, setUsePantry] = useState(true);
    const [creating, setCreating] = useState(false);
    const [createError, setCreateError] = useState("");

    const [code, setCode] = useState("");
    const [joining, setJoining] = useState(false);
    const [joinError, setJoinError] = useState("");

    const [hosted, setHosted] = useState([]);
    const [deletingCode, setDeletingCode] = useState("");
    const [deleteError, setDeleteError] = useState("");

    // le feste a cui ho partecipato stanno in localStorage: è una
    // lettura sincrona, non ha senso passare da un effetto. Quando una
    // festa viene eliminata la tolgo anche qui, senza dover rileggere
    // tutto lo storage
    const [forgottenCodes, setForgottenCodes] = useState(() => new Set());
    const remembered = useMemo(
        () => readRememberedParties(user?.uid).filter((saved) => !forgottenCodes.has(saved.code)),
        [user, forgottenCodes]
    );

    useEffect(() => {
        if (!user) {
            return;
        }

        listMyParties(user.uid)
            .then(setHosted)
            .catch((error) => console.error(error));
    }, [user]);

    // le feste ricordate qui non sono mai state verificate: se l'host
    // ne ha cancellata una, io (che ero solo cliente) non lo saprei mai
    // finché non provo ad aprirla. Le controllo una volta all'ingresso
    // nella pagina e tolgo dalla vista quelle ormai sparite
    useEffect(() => {
        if (!user) {
            return;
        }

        let cancelled = false;
        const toCheck = readRememberedParties(user.uid);

        Promise.all(
            toCheck.map((saved) =>
                fetchParty(saved.code)
                    .then((party) => ({ code: saved.code, exists: Boolean(party) }))
                    .catch(() => ({ code: saved.code, exists: true }))
            )
        ).then((results) => {
            if (cancelled) {
                return;
            }

            const missing = results.filter((result) => !result.exists).map((result) => result.code);

            if (missing.length > 0) {
                missing.forEach((missingCode) => forgetParty(user.uid, missingCode));
                setForgottenCodes((current) => new Set([...current, ...missing]));
            }
        });

        return () => {
            cancelled = true;
        };
    }, [user]);

    const handleDeleteParty = async (partyCode) => {
        if (!window.confirm("Eliminare questa festa? Ordini, bancone e partecipanti spariranno per sempre.")) {
            return;
        }

        setDeleteError("");
        setDeletingCode(partyCode);

        try {
            await deleteParty({ code: partyCode });

            forgetParty(user?.uid, partyCode);
            setHosted((current) => current.filter((party) => party.id !== partyCode));
            setForgottenCodes((current) => new Set(current).add(partyCode));
            refreshPartyList();
        } catch (error) {
            console.error(error);
            setDeleteError("Non è stato possibile eliminare la festa. Riprova.");
        } finally {
            setDeletingCode("");
        }
    };

    const handleCreate = async (event) => {
        event.preventDefault();
        setCreateError("");

        try {
            setCreating(true);

            const newCode = await createParty({
                user,
                name,
                pantry: usePantry && !pantryLoading ? inventory : []
            });

            rememberParty(user.uid, { code: newCode, name, role: "bar" });
            refreshPartyList();
            navigate(`/party/${newCode}`);
        } catch (error) {
            console.error(error);
            setCreateError(
                error instanceof PartyError
                    ? error.message
                    : "Non è stato possibile aprire la festa. Controlla la connessione e riprova."
            );
        } finally {
            setCreating(false);
        }
    };

    const handleJoin = async (event) => {
        event.preventDefault();
        setJoinError("");

        if (!isValidPartyCode(code)) {
            setJoinError("Il codice è di sei caratteri: controlla di averlo scritto tutto.");
            return;
        }

        try {
            setJoining(true);

            const party = await joinParty({ user, code });
            const normalized = normalizePartyCode(code);

            rememberParty(user.uid, {
                code: normalized,
                name: party.name,
                role: party.hostId === user.uid ? "bar" : "cliente"
            });

            navigate(`/party/${normalized}`);
        } catch (error) {
            console.error(error);
            setJoinError(
                error instanceof PartyError
                    ? error.message
                    : "Non è stato possibile entrare. Controlla la connessione e riprova."
            );
        } finally {
            setJoining(false);
        }
    };

    // le feste a cui ho partecipato me le ricordo sul dispositivo, quelle
    // che ho aperto io le ritrovo con una query: le unisco senza doppioni
    const openParties = [
        ...hosted.map((party) => ({
            code: party.id,
            name: party.name,
            active: party.active,
            started: party.started,
            isHost: true
        })),
        ...remembered.filter((saved) => !hosted.some((party) => party.id === saved.code))
    ];

    return (
        <div className="shell-narrow page page-festa">
            <header className="page-head">
                <div className="page-head-text">
                    <h1 className="display display-l">Festa</h1>
                    <p className="lede">Uno fa il bar, gli altri ordinano dal telefono.</p>
                </div>
            </header>

            {openParties.length > 0 && (
                <section className="party-hub">
                    <div className="home-section-head">
                        <div>
                            <h2 className="home-section-title">Le tue feste</h2>
                        </div>
                        <span className="count">
                            {openParties.length} {openParties.length === 1 ? "festa" : "feste"}
                        </span>
                    </div>

                    {deleteError && (
                        <div className="form-error" role="alert">
                            {deleteError}
                        </div>
                    )}

                    <ul className="party-grid">
                        {openParties.map((party) => {
                            const isBar = party.isHost || party.role === "bar";
                            const status =
                                party.started === false
                                    ? "in preparazione"
                                    : party.active === false
                                    ? "chiusa"
                                    : null;

                            return (
                                <li className="party-ticket" key={party.code}>
                                    <Link to={`/party/${party.code}`} className="party-ticket-link">
                                        <span className="party-ticket-arrow" aria-hidden="true">
                                            &rarr;
                                        </span>
                                        <span className="party-ticket-code">
                                            {formatPartyCode(party.code)}
                                        </span>
                                        <span className="party-ticket-name">
                                            {party.name || "Festa senza nome"}
                                        </span>
                                        <span className="party-ticket-meta">
                                            {isBar ? "Sei il bar" : "Sei cliente"}
                                            {status && ` · ${status}`}
                                        </span>
                                    </Link>

                                    {party.isHost && (
                                        <div className="party-ticket-foot">
                                            <button
                                                type="button"
                                                className="btn btn-danger-quiet btn-sm"
                                                disabled={deletingCode === party.code}
                                                onClick={() => handleDeleteParty(party.code)}
                                            >
                                                {deletingCode === party.code ? "Elimino..." : "Elimina"}
                                            </button>
                                        </div>
                                    )}
                                </li>
                            );
                        })}
                    </ul>
                </section>
            )}

            <div className="party-secondary">
                <section className="party-card party-card-quiet">
                    <h2 className="recipe-block-title">Crea una festa</h2>

                    {createError && (
                        <div className="form-error" role="alert">
                            {createError}
                        </div>
                    )}

                    <form onSubmit={handleCreate}>
                        <div className="field">
                            <label className="field-label" htmlFor="party-name">
                                Come la chiamiamo
                            </label>
                            <input
                                id="party-name"
                                className="input"
                                type="text"
                                placeholder="Capodanno da me"
                                value={name}
                                maxLength={PARTY_NAME_MAX_LENGTH}
                                onChange={(event) => setName(event.target.value)}
                            />
                        </div>

                        {/* finché la dispensa non è arrivata risulterebbe vuota
                            anche a chi ce l'ha piena, e la festa partirebbe con
                            il bancone spoglio: meglio aspettare un attimo */}
                        <label className="checkbox-row">
                            <input
                                type="checkbox"
                                checked={usePantry && !pantryLoading && inventory.length > 0}
                                disabled={pantryLoading || inventory.length === 0}
                                onChange={(event) => setUsePantry(event.target.checked)}
                            />
                            <span className="checkbox-text">
                                Parti dalla mia dispensa
                                <span className="checkbox-hint">
                                    {pantryLoading
                                        ? "Un attimo..."
                                        : inventory.length > 0
                                        ? `${inventory.length} ingredienti pronti sul bancone`
                                        : "Dispensa vuota"}
                                </span>
                            </span>
                        </label>

                        <div className="form-actions">
                            <button
                                type="submit"
                                className="btn btn-success btn-hero"
                                disabled={creating || pantryLoading}
                            >
                                {creating ? "Apro..." : "Apri la festa"}
                            </button>
                        </div>
                    </form>
                </section>

                <section className="party-card party-card-quiet">
                    <h2 className="recipe-block-title">Entra con il codice</h2>

                    {joinError && (
                        <div className="form-error" role="alert">
                            {joinError}
                        </div>
                    )}

                    <form onSubmit={handleJoin}>
                        <div className="field">
                            <label className="field-label" htmlFor="party-code">
                                Codice della festa
                            </label>
                            <input
                                id="party-code"
                                className="input input-code"
                                type="text"
                                inputMode="text"
                                autoCapitalize="characters"
                                autoComplete="off"
                                placeholder="AB3 K9Z"
                                value={code}
                                onChange={(event) => setCode(normalizePartyCode(event.target.value))}
                            />
                        </div>

                        <div className="form-actions">
                            <button
                                type="submit"
                                className="btn btn-primary btn-hero"
                                disabled={joining}
                            >
                                {joining ? "Entro..." : "Entra"}
                            </button>
                        </div>
                    </form>
                </section>
            </div>
        </div>
    );
}

export default Party;
