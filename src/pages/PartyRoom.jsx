import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { Link, useNavigate, useParams, useSearchParams } from "react-router-dom";

import { collection, getDocs, onSnapshot, query, where } from "firebase/firestore";

import db from "../firebase/firestore";
import {
    ORDER_PREPARING,
    ORDER_QUEUED,
    ORDER_READY,
    PartyError,
    ROLE_BAR,
    cancelOrder,
    clearOrderHistory,
    deleteParty,
    joinParty,
    participantRef,
    placeOrder,
    savePartyInventory,
    serveOrder,
    setDrinkRemoved,
    setParticipantRole,
    setPartyActive,
    setPartyMenu,
    startOrder,
    startParty,
    subscribeInventory,
    subscribeOrders,
    subscribeParticipants,
    subscribeParty
} from "../firebase/party";

import { useAuth } from "../context/useAuth";
import { useInventory } from "../context/useInventory";
import { usePartyList } from "../context/usePartyList";
import { normalizeIngredients } from "../utils/drink";
import { formatPartyCode, normalizePartyCode } from "../utils/partyCode";
import { emptyPartyInventory } from "../utils/partyInventory";
import { forgetParty, rememberParty } from "../utils/partyStorage";
import { showNotification } from "../utils/notifications";

import EmptyState from "../components/EmptyState";
import { Loader } from "../components/Loader";
import { IconBottle, IconGlass, IconShaker, IconTicket, IconUser } from "../components/NavIcons";
import PartyInventoryEditor from "../components/PartyInventoryEditor";
import PartyMenu from "../components/PartyMenu";
import PartyOrderQueue, { OrderStatus } from "../components/PartyOrderQueue";
import PartyParticipants from "../components/PartyParticipants";
import PartyPlanner from "../components/PartyPlanner";

const BAR_TABS_DRAFT = [
    { id: "prepara", label: "Prepara", icon: IconShaker },
    { id: "bancone", label: "Bancone", icon: IconBottle }
];

const BAR_TABS_LIVE = [
    { id: "coda", label: "Coda", icon: IconTicket },
    { id: "menu", label: "Menù", icon: IconGlass },
    { id: "prepara", label: "Prepara", icon: IconShaker },
    { id: "bancone", label: "Bancone", icon: IconBottle },
    { id: "persone", label: "Persone", icon: IconUser }
];

const CUSTOMER_TABS = [
    { id: "menu", label: "Menù", icon: IconGlass },
    { id: "miei", label: "I miei ordini" }
];

function PartyRoomView({ code, initialTab }) {
    const { user } = useAuth();
    const { inventory: pantry } = useInventory();
    const { refresh: refreshPartyList } = usePartyList();
    const navigate = useNavigate();

    const [party, setParty] = useState(undefined);
    const [myParticipant, setMyParticipant] = useState(undefined);
    const [participants, setParticipants] = useState([]);
    const [orders, setOrders] = useState([]);
    const [inventory, setInventory] = useState(emptyPartyInventory());
    const [catalog, setCatalog] = useState([]);

    const [tab, setTab] = useState(initialTab || "");
    const [busyId, setBusyId] = useState("");
    const [savingInventory, setSavingInventory] = useState(false);
    const [starting, setStarting] = useState(false);
    const [actionError, setActionError] = useState("");
    const [joining, setJoining] = useState(false);
    const [copied, setCopied] = useState(false);
    const [deleting, setDeleting] = useState(false);
    const [clearingHistory, setClearingHistory] = useState(false);

    const isParticipant = Boolean(myParticipant);
    const isHost = Boolean(party && user && party.hostId === user.uid);
    const isBar = isHost || myParticipant?.role === ROLE_BAR;

    useEffect(() => {
        return subscribeParty(
            code,
            (value) => setParty(value),
            (error) => {
                console.error(error);
                setParty(null);
            }
        );
    }, [code]);

    // il mio documento partecipante lo posso leggere sempre: mi serve
    // proprio per sapere se sono dentro o se devo ancora entrare
    useEffect(() => {
        if (!user) {
            return undefined;
        }

        return onSnapshot(
            participantRef(code, user.uid),
            (snapshot) =>
                setMyParticipant(snapshot.exists() ? { id: snapshot.id, ...snapshot.data() } : null),
            (error) => {
                console.error(error);
                setMyParticipant(null);
            }
        );
    }, [code, user]);

    useEffect(() => {
        if (!isParticipant) {
            return undefined;
        }

        const unsubscribes = [
            subscribeParticipants(code, setParticipants, (error) => console.error(error)),
            subscribeOrders(code, setOrders, (error) => console.error(error)),
            subscribeInventory(code, setInventory, (error) => console.error(error))
        ];

        return () => unsubscribes.forEach((unsubscribe) => unsubscribe());
    }, [code, isParticipant]);

    // la libreria da cui si sceglie il menù pesca dai drink pubblici:
    // sono le ricette che anche un co-bartender può rileggere. Il menù
    // vero e proprio, quello ordinabile, è poi il sottoinsieme che il
    // bar ha scelto in fase di preparazione (party.menuDrinkIds)
    useEffect(() => {
        if (!isParticipant) {
            return undefined;
        }

        let cancelled = false;

        getDocs(query(collection(db, "drinks"), where("isPublic", "==", true)))
            .then((snapshot) => {
                if (cancelled) {
                    return;
                }

                setCatalog(
                    snapshot.docs
                        .map((document) => ({
                            id: document.id,
                            name: document.data().name ?? "Senza nome",
                            ingredients: normalizeIngredients(document.data().ingredients)
                        }))
                        .sort((first, second) => first.name.localeCompare(second.name, "it"))
                );
            })
            .catch((error) => console.error(error));

        return () => {
            cancelled = true;
        };
    }, [isParticipant]);

    useEffect(() => {
        if (party && isParticipant && user) {
            rememberParty(user.uid, {
                code,
                name: party.name,
                role: isBar ? "bar" : "cliente"
            });
        }
    }, [party, isParticipant, isBar, code, user]);

    // se l'host cancella la festa mentre la sto guardando (o riapro un
    // codice ormai sparito), il listener di subscribeParty se ne accorge
    // subito: tolgo il codice anche dal mio dispositivo, sennò resta per
    // sempre nella lista "ci sei già stato" anche se non esiste più
    useEffect(() => {
        if (party === null && user) {
            forgetParty(user.uid, code);
        }
    }, [party, user, code]);

    const myOrders = useMemo(
        () => orders.filter((order) => order.requestedBy === user?.uid),
        [orders, user]
    );

    // il menù ordinabile è la libreria filtrata su quello che il bar ha
    // scelto in preparazione. Le feste senza menuDrinkIds (create prima
    // di questa scheda) restano com'erano: tutto il pubblico ordinabile
    const menu = useMemo(() => {
        if (!Array.isArray(party?.menuDrinkIds)) {
            return catalog;
        }

        return catalog.filter((drink) => party.menuDrinkIds.includes(drink.id));
    }, [catalog, party]);

    // notifica locale quando un mio ordine cambia stato: non c'è push
    // cross-dispositivo, ma se la scheda è aperta l'aggiornamento arriva
    // da onSnapshot e tanto basta
    const seenStatuses = useRef(new Map());

    useEffect(() => {
        const known = seenStatuses.current;
        const firstRun = known.size === 0;

        myOrders.forEach((order) => {
            const previous = known.get(order.id);

            if (!firstRun && previous && previous !== order.status) {
                if (order.status === ORDER_PREPARING) {
                    showNotification(
                        "Il tuo drink è in preparazione",
                        `${order.drinkName} è sul bancone, ci stanno lavorando.`
                    );
                } else if (order.status === ORDER_READY) {
                    showNotification("Il tuo drink è pronto", `${order.drinkName} ti aspetta al bancone.`);
                }
            }

            known.set(order.id, order.status);
        });
    }, [myOrders]);

    // notifica locale all'host quando arriva un ordine nuovo di zecca:
    // guardo solo gli id mai visti prima, sennò un ordine che passa da
    // "in coda" ad altro stato riattiverebbe la notifica
    const knownOrderIds = useRef(new Set());
    const orderIdsInitialized = useRef(false);

    useEffect(() => {
        if (!isHost) {
            return;
        }

        const known = knownOrderIds.current;

        orders.forEach((order) => {
            if (orderIdsInitialized.current && !known.has(order.id) && order.status === ORDER_QUEUED) {
                showNotification(
                    "Nuovo ordine in coda",
                    `${order.requestedByName || "Un ospite"} ha ordinato ${order.drinkName}.`
                );
            }

            known.add(order.id);
        });

        orderIdsInitialized.current = true;
    }, [orders, isHost]);

    // le schede cambiano quando l'host mi promuove a bar: invece di
    // reimpostarle a mano ricado sulla prima valida, così il passaggio
    // da cliente a bar non mi lascia su una scheda che non esiste più
    const isDraft = party?.started === false;
    const tabs = isBar ? (isDraft ? BAR_TABS_DRAFT : BAR_TABS_LIVE) : CUSTOMER_TABS;
    const activeTab = tabs.some((entry) => entry.id === tab) ? tab : tabs[0].id;

    const runAction = useCallback(async (id, action) => {
        setActionError("");
        setBusyId(id);

        try {
            await action();
        } catch (error) {
            console.error(error);
            setActionError(
                error instanceof PartyError ? error.message : "Qualcosa non ha funzionato. Riprova."
            );
        } finally {
            setBusyId("");
        }
    }, []);

    const handleJoin = async () => {
        setActionError("");
        setJoining(true);

        try {
            await joinParty({ user, code });
        } catch (error) {
            console.error(error);
            setActionError(
                error instanceof PartyError ? error.message : "Non è stato possibile entrare."
            );
        } finally {
            setJoining(false);
        }
    };

    const handleCopyCode = async () => {
        try {
            await navigator.clipboard.writeText(code);
            setCopied(true);
        } catch (error) {
            console.error(error);
            setCopied(false);
        }
    };

    const handleDeleteParty = async () => {
        if (!window.confirm("Eliminare questa festa? Ordini, bancone e partecipanti spariranno per sempre.")) {
            return;
        }

        setActionError("");
        setDeleting(true);

        try {
            await deleteParty({ code });

            if (user) {
                forgetParty(user.uid, code);
            }

            refreshPartyList();
            navigate("/party");
        } catch (error) {
            console.error(error);
            setActionError("Non è stato possibile eliminare la festa. Riprova.");
            setDeleting(false);
        }
    };

    const handleSaveInventory = async ({ base, inventory: edited }) => {
        setSavingInventory(true);
        setActionError("");

        try {
            await savePartyInventory({ code, base, inventory: edited });

            return true;
        } catch (error) {
            console.error(error);
            setActionError("Non è stato possibile salvare l'inventario. Riprova.");

            return false;
        } finally {
            setSavingInventory(false);
        }
    };

    const handleClearHistory = async () => {
        if (
            !window.confirm(
                "Svuotare la cronologia della coda? Gli ordini già passati (pronti o annullati) spariranno per sempre."
            )
        ) {
            return;
        }

        setActionError("");
        setClearingHistory(true);

        try {
            await clearOrderHistory({ code });
        } catch (error) {
            console.error(error);
            setActionError("Non è stato possibile svuotare la cronologia. Riprova.");
        } finally {
            setClearingHistory(false);
        }
    };

    const handleToggleMenuDrink = (drink, included) =>
        runAction(drink.id, async () => {
            const current = Array.isArray(party?.menuDrinkIds) ? party.menuDrinkIds : [];
            const next = included ? [...current, drink.id] : current.filter((id) => id !== drink.id);

            await setPartyMenu({ code, drinkIds: next });
            refreshPartyList();
        });

    const handleStartParty = async () => {
        setActionError("");
        setStarting(true);

        try {
            await startParty({ code });
        } catch (error) {
            console.error(error);
            setActionError("Non è stato possibile avviare la festa. Riprova.");
        } finally {
            setStarting(false);
        }
    };

    if (party === undefined) {
        return <Loader label="Apro la festa" />;
    }

    if (party === null) {
        return (
            <div className="shell page">
                <EmptyState title="Questa festa non esiste">
                    <Link to="/party" className="btn btn-primary btn-hero">
                        Torna alle feste
                    </Link>
                </EmptyState>
            </div>
        );
    }

    if (myParticipant === undefined) {
        return <Loader label="Controllo se sei della compagnia" />;
    }

    if (!isParticipant) {
        return (
            <div className="shell-narrow page">
                <EmptyState
                    eyebrow={formatPartyCode(code)}
                    title={party.name || "Festa senza nome"}
                    body={
                        party.started === false
                            ? "Il bar sta ancora preparando."
                            : party.active === false
                            ? "Festa chiusa."
                            : null
                    }
                >
                    {party.started !== false && party.active !== false && (
                        <button
                            type="button"
                            className="btn btn-primary btn-hero"
                            onClick={handleJoin}
                            disabled={joining}
                        >
                            {joining ? "Entro..." : "Entra"}
                        </button>
                    )}
                    <Link to="/party" className="btn btn-outline">
                        Indietro
                    </Link>
                </EmptyState>

                {actionError && (
                    <div className="notice notice-error" role="alert">
                        {actionError}
                    </div>
                )}
            </div>
        );
    }

    const queuedCount = orders.filter((order) => order.status === ORDER_QUEUED).length;

    return (
        <div className="shell page">
            <header className="page-head">
                <div className="page-head-text">
                    <h1 className="display display-l">{party.name || "Festa senza nome"}</h1>
                    <p className="lede">
                        {isDraft
                            ? "In preparazione"
                            : `${isBar ? "Sei il bar" : "Sei cliente"} · ${participants.length}${
                                  participants.length === 1 ? " persona" : " persone"
                              }${party.active === false ? " · chiusa" : ""}`}
                    </p>

                    {(isHost || (isBar && isDraft)) && (
                        <div className="form-actions party-lifecycle-actions">
                            {isBar && isDraft && (
                                <button
                                    type="button"
                                    className="btn btn-success btn-hero"
                                    onClick={handleStartParty}
                                    disabled={starting || (party.menuDrinkIds ?? []).length === 0}
                                >
                                    {starting ? "Avvio..." : "Avvia la festa"}
                                </button>
                            )}

                            {isHost && !isDraft && (
                                <button
                                    type="button"
                                    className="btn btn-outline"
                                    onClick={() =>
                                        runAction("party", () =>
                                            setPartyActive({ code, active: party.active === false })
                                        )
                                    }
                                >
                                    {party.active === false ? "Riapri la festa" : "Ferma la festa"}
                                </button>
                            )}

                            {isHost && (
                                <button
                                    type="button"
                                    className="btn btn-danger-quiet"
                                    onClick={handleDeleteParty}
                                    disabled={deleting}
                                >
                                    {deleting ? "Elimino..." : "Elimina festa"}
                                </button>
                            )}
                        </div>
                    )}
                </div>

                <div className="party-code-box">
                    <span className="eyebrow">Codice</span>
                    <span className="party-code">{formatPartyCode(code)}</span>
                    <button type="button" className="btn btn-outline btn-sm" onClick={handleCopyCode}>
                        {copied ? "Copiato" : "Copia"}
                    </button>
                </div>
            </header>

            {!isDraft && party.active === false && (
                <div className="notice">La festa è chiusa: non si ordina più.</div>
            )}

            {actionError && (
                <div className="notice notice-error" role="alert">
                    {actionError}
                </div>
            )}

            <div className="party-tabs" role="tablist">
                {tabs.map((entry) => {
                    const Icon = entry.icon;
                    const classNames = [
                        "party-tab",
                        `party-tab--${entry.id}`,
                        activeTab === entry.id ? "is-active" : ""
                    ]
                        .filter(Boolean)
                        .join(" ");

                    return (
                        <button
                            key={entry.id}
                            type="button"
                            role="tab"
                            aria-selected={activeTab === entry.id}
                            className={classNames}
                            onClick={() => setTab(entry.id)}
                        >
                            {Icon && <Icon />}
                            {entry.label}
                            {entry.id === "coda" && queuedCount > 0 && (
                                <span className="party-tab-count">{queuedCount}</span>
                            )}
                        </button>
                    );
                })}
            </div>

            {activeTab === "prepara" && isBar && (
                <PartyPlanner
                    catalog={catalog}
                    selectedIds={party.menuDrinkIds ?? []}
                    pantry={pantry}
                    partyInventory={inventory}
                    togglingId={busyId}
                    onRemove={(drink) => handleToggleMenuDrink(drink, false)}
                />
            )}

            {activeTab === "menu" && (
                <PartyMenu
                    drinks={menu}
                    inventory={inventory}
                    canOrder={party.active !== false}
                    ordering={busyId}
                    isBar={isBar}
                    onOrder={(drink) => runAction(drink.id, () => placeOrder({ code, user, drink }))}
                    onToggleRemoved={(drink, removed) =>
                        runAction(drink.id, () => setDrinkRemoved({ code, drinkId: drink.id, removed }))
                    }
                />
            )}

            {activeTab === "coda" && isBar && (
                <PartyOrderQueue
                    orders={orders}
                    busyId={busyId}
                    onStart={(order) =>
                        runAction(order.id, () => startOrder({ code, orderId: order.id, user }))
                    }
                    onServe={(order) => runAction(order.id, () => serveOrder({ code, order, user }))}
                    onCancel={(order) =>
                        runAction(order.id, () => cancelOrder({ code, orderId: order.id }))
                    }
                    canClearHistory={isHost}
                    clearingHistory={clearingHistory}
                    onClearHistory={handleClearHistory}
                />
            )}

            {activeTab === "bancone" && isBar && (
                <PartyInventoryEditor
                    inventory={inventory}
                    onSave={handleSaveInventory}
                    saving={savingInventory}
                    menuDrinks={menu}
                />
            )}

            {activeTab === "persone" && isBar && (
                <PartyParticipants
                    participants={participants}
                    hostId={party.hostId}
                    isHost={isHost}
                    currentUserId={user.uid}
                    busyId={busyId}
                    onChangeRole={(uid, role) =>
                        runAction(uid, () => setParticipantRole({ code, uid, role }))
                    }
                />
            )}

            {activeTab === "miei" && (
                <div className="order-queue">
                    {myOrders.length === 0 ? (
                        <p className="recipe-text">Non hai ancora ordinato niente.</p>
                    ) : (
                        <ul className="order-list">
                            {[...myOrders].reverse().map((order) => (
                                <li className="order" key={order.id}>
                                    <div className="order-text">
                                        <span className="order-drink">{order.drinkName}</span>
                                        <span className="order-meta">
                                            {order.status === ORDER_READY
                                                ? "Vai a prenderlo al bancone"
                                                : "Il bar ci sta pensando"}
                                        </span>
                                    </div>

                                    <OrderStatus status={order.status} />

                                    {order.status === ORDER_QUEUED && (
                                        <div className="order-actions">
                                            <button
                                                type="button"
                                                className="btn btn-danger-quiet btn-sm"
                                                disabled={busyId === order.id}
                                                onClick={() =>
                                                    runAction(order.id, () =>
                                                        cancelOrder({ code, orderId: order.id })
                                                    )
                                                }
                                            >
                                                Annulla
                                            </button>
                                        </div>
                                    )}
                                </li>
                            ))}
                        </ul>
                    )}
                </div>
            )}
        </div>
    );
}

// con key={code} il componente riparte da zero quando cambio festa,
// sennò restano attaccate le sottoscrizioni di quella vecchia
function PartyRoom() {
    const { code } = useParams();
    const [searchParams] = useSearchParams();

    return (
        <PartyRoomView
            key={code}
            code={normalizePartyCode(code)}
            initialTab={searchParams.get("tab") ?? ""}
        />
    );
}

export default PartyRoom;
