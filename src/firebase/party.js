import {
    collection,
    deleteDoc,
    doc,
    getDoc,
    getDocs,
    limit,
    onSnapshot,
    orderBy,
    query,
    runTransaction,
    serverTimestamp,
    setDoc,
    updateDoc,
    where,
    writeBatch
} from "firebase/firestore";

import db from "./firestore";
import { generatePartyCode, normalizePartyCode } from "../utils/partyCode";
import {
    addPantryToPartyInventory,
    buildPartyInventory,
    consumeDrink,
    emptyPartyInventory,
    mergePartyInventory,
    missingLabel,
    normalizePartyInventory
} from "../utils/partyInventory";
import { normalizeEstimatedPeople } from "../utils/partyShopping";

export const ROLE_BAR = "bar";
export const ROLE_CUSTOMER = "cliente";

export const ORDER_QUEUED = "in coda";
export const ORDER_PREPARING = "in preparazione";
export const ORDER_READY = "pronto";
export const ORDER_CANCELLED = "annullato";

export const ORDER_STATUSES = [ORDER_QUEUED, ORDER_PREPARING, ORDER_READY, ORDER_CANCELLED];

export const PARTY_NAME_MAX_LENGTH = 60;

// il documento della festa ha come id il codice stesso: così per entrare
// basta leggere un documento (getDoc), e le regole possono vietare di
// elencare la collection senza impedire a chi ha il codice di entrare
const INVENTORY_DOC_ID = "current";

// errori che l'utente deve leggere così come sono ("il gin è finito"),
// separati da quelli tecnici che finiscono solo in console
export class PartyError extends Error {
    constructor(message) {
        super(message);
        this.name = "PartyError";
    }
}

export function partyRef(code) {
    return doc(db, "partySessions", normalizePartyCode(code));
}

export function participantsRef(code) {
    return collection(db, "partySessions", normalizePartyCode(code), "participants");
}

export function participantRef(code, uid) {
    return doc(db, "partySessions", normalizePartyCode(code), "participants", uid);
}

export function ordersRef(code) {
    return collection(db, "partySessions", normalizePartyCode(code), "orders");
}

export function orderRef(code, orderId) {
    return doc(db, "partySessions", normalizePartyCode(code), "orders", orderId);
}

export function inventoryRef(code) {
    return doc(db, "partySessions", normalizePartyCode(code), "inventory", INVENTORY_DOC_ID);
}

// le regole tagliano i nomi a 80 caratteri: meglio accorciare qui che
// farsi rifiutare la scrittura da firestore
function displayNameOf(user) {
    const name = user?.displayName || user?.email?.split("@")[0] || "";

    return name.trim().slice(0, 80) || "Ospite";
}

export async function fetchParty(code) {
    const snapshot = await getDoc(partyRef(code));

    return snapshot.exists() ? { id: snapshot.id, ...snapshot.data() } : null;
}

// provo qualche codice finché non ne trovo uno libero. se due host
// partono nello stesso istante con lo stesso codice la seconda scrittura
// diventa un update e le regole la bloccano, quindi il peggio che
// succede è un errore, non una festa sovrascritta
async function findFreeCode(attempts = 6) {
    for (let attempt = 0; attempt < attempts; attempt += 1) {
        const code = generatePartyCode();
        const existing = await getDoc(partyRef(code));

        if (!existing.exists()) {
            return code;
        }
    }

    throw new PartyError("Non riesco a generare un codice libero. Riprova tra un attimo.");
}

export async function createParty({ user, name, pantry = [], estimatedPeople = 0 }) {
    if (!user) {
        throw new PartyError("Devi essere connesso per aprire una festa.");
    }

    const code = await findFreeCode();
    const trimmedName = String(name ?? "").trim().slice(0, PARTY_NAME_MAX_LENGTH);
    const inventory = buildPartyInventory(pantry);

    // sessione, partecipante-host e inventario nascono insieme: se
    // arrivasse solo la sessione l'host non sarebbe nemmeno bar della
    // propria festa
    const batch = writeBatch(db);

    batch.set(partyRef(code), {
        code,
        name: trimmedName || "Festa senza nome",
        hostId: user.uid,
        hostName: displayNameOf(user),
        active: true,
        // la festa nasce in preparazione: si sceglie il menù con calma,
        // nessuno può ancora entrare finché non la avvii
        started: false,
        menuDrinkIds: [],
        // stima facoltativa degli invitati: la usa solo la scheda "Spesa"
        // per moltiplicare le dosi. 0 vuol dire "non l'ho indicato"
        estimatedPeople: normalizeEstimatedPeople(estimatedPeople),
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp()
    });

    batch.set(participantRef(code, user.uid), {
        displayName: displayNameOf(user),
        role: ROLE_BAR,
        joinedAt: serverTimestamp()
    });

    batch.set(inventoryRef(code), {
        amounts: inventory.amounts,
        extras: inventory.extras,
        removedDrinks: [],
        updatedAt: serverTimestamp()
    });

    await batch.commit();

    return code;
}

export async function joinParty({ user, code }) {
    if (!user) {
        throw new PartyError("Devi essere connesso per entrare in una festa.");
    }

    const normalized = normalizePartyCode(code);
    const party = await fetchParty(normalized);

    if (!party) {
        throw new PartyError("Nessuna festa con questo codice. Controlla di averlo copiato bene.");
    }

    // solo l'host può entrare in una festa ancora in preparazione: gli
    // altri lo trovano finché non preme "avvia la festa"
    if (party.started === false && party.hostId !== user.uid) {
        throw new PartyError("Questa festa è ancora in preparazione: il bar non ha aperto le porte.");
    }

    if (party.active === false) {
        throw new PartyError("Questa festa è chiusa: il bar ha già staccato.");
    }

    const existing = await getDoc(participantRef(normalized, user.uid));

    // se ero già dentro non mi retrocedo da solo da bar a cliente
    if (!existing.exists()) {
        await setDoc(participantRef(normalized, user.uid), {
            displayName: displayNameOf(user),
            role: party.hostId === user.uid ? ROLE_BAR : ROLE_CUSTOMER,
            joinedAt: serverTimestamp()
        });
    }

    return party;
}

export async function listMyParties(uid) {
    if (!uid) {
        return [];
    }

    const snapshot = await getDocs(
        query(
            collection(db, "partySessions"),
            where("hostId", "==", uid),
            orderBy("createdAt", "desc"),
            limit(10)
        )
    );

    return snapshot.docs.map((document) => ({ id: document.id, ...document.data() }));
}

export function subscribeParty(code, onChange, onError) {
    return onSnapshot(
        partyRef(code),
        (snapshot) => onChange(snapshot.exists() ? { id: snapshot.id, ...snapshot.data() } : null),
        onError
    );
}

export function subscribeParticipants(code, onChange, onError) {
    return onSnapshot(
        participantsRef(code),
        (snapshot) =>
            onChange(snapshot.docs.map((document) => ({ id: document.id, ...document.data() }))),
        onError
    );
}

// con serverTimestamps: "estimate" l'ordine appena mandato ha già un
// orario invece di un null, sennò per un attimo salta in cima alla coda
// e sembra arrivato prima di quelli veri
export function subscribeOrders(code, onChange, onError) {
    return onSnapshot(
        query(ordersRef(code), orderBy("createdAt", "asc")),
        (snapshot) =>
            onChange(
                snapshot.docs.map((document) => ({
                    id: document.id,
                    ...document.data({ serverTimestamps: "estimate" })
                }))
            ),
        onError
    );
}

// solo gli ordini ancora in coda: serve al bottone in navbar che
// segnala "hai ordini in attesa" senza tirarsi dietro tutto lo storico
export function subscribeQueuedOrders(code, onChange, onError) {
    return onSnapshot(
        query(ordersRef(code), where("status", "==", ORDER_QUEUED)),
        (snapshot) =>
            onChange(
                snapshot.docs.map((document) => ({
                    id: document.id,
                    ...document.data({ serverTimestamps: "estimate" })
                }))
            ),
        onError
    );
}

export function subscribeInventory(code, onChange, onError) {
    return onSnapshot(
        inventoryRef(code),
        (snapshot) =>
            onChange(snapshot.exists() ? normalizePartyInventory(snapshot.data()) : emptyPartyInventory()),
        onError
    );
}

// salvo in transazione e fondo con quello che c'è adesso sul server:
// mentre il bar correggeva il bancone, gli ordini serviti hanno già
// scalato dei millilitri e non voglio rimetterli al loro posto
export async function savePartyInventory({ code, base, inventory }) {
    return runTransaction(db, async (transaction) => {
        const currentRef = inventoryRef(code);
        const snapshot = await transaction.get(currentRef);

        const merged = mergePartyInventory(
            base,
            inventory,
            snapshot.exists() ? snapshot.data() : emptyPartyInventory()
        );

        transaction.set(currentRef, {
            amounts: merged.amounts,
            extras: merged.extras,
            removedDrinks: merged.removedDrinks,
            updatedAt: serverTimestamp()
        });

        return merged;
    });
}

// quando l'host aggiorna la dispensa personale, le feste ancora aperte
// ricevono solo le aggiunte: leggo il bancone fresco dentro la
// transazione così non scavalco quello che un bar ha appena servito o
// aggiunto a mano
export async function syncPartyInventoryFromPantry({ code, pantry }) {
    return runTransaction(db, async (transaction) => {
        const currentRef = inventoryRef(code);
        const snapshot = await transaction.get(currentRef);
        const current = normalizePartyInventory(snapshot.exists() ? snapshot.data() : emptyPartyInventory());
        const next = addPantryToPartyInventory(pantry, current);

        transaction.set(currentRef, {
            amounts: next.amounts,
            extras: next.extras,
            removedDrinks: current.removedDrinks,
            updatedAt: serverTimestamp()
        });

        return { amounts: next.amounts, extras: next.extras, removedDrinks: current.removedDrinks };
    });
}

// togliere un drink dal bancone è indipendente dalle scorte: il bar può
// avere tutti gli ingredienti e non volerlo comunque servire più
export async function setDrinkRemoved({ code, drinkId, removed }) {
    if (!drinkId) {
        throw new PartyError("Drink non valido.");
    }

    await runTransaction(db, async (transaction) => {
        const currentRef = inventoryRef(code);
        const snapshot = await transaction.get(currentRef);
        const current = normalizePartyInventory(snapshot.exists() ? snapshot.data() : emptyPartyInventory());

        const removedDrinks = removed
            ? [...new Set([...current.removedDrinks, drinkId])]
            : current.removedDrinks.filter((id) => id !== drinkId);

        transaction.set(currentRef, {
            amounts: current.amounts,
            extras: current.extras,
            removedDrinks,
            updatedAt: serverTimestamp()
        });
    });
}

export async function setParticipantRole({ code, uid, role }) {
    if (role !== ROLE_BAR && role !== ROLE_CUSTOMER) {
        throw new PartyError("Ruolo non valido.");
    }

    await updateDoc(participantRef(code, uid), { role });
}

export async function setPartyActive({ code, active }) {
    await updateDoc(partyRef(code), { active, updatedAt: serverTimestamp() });
}

// il menù è la lista di drink che il bar ha scelto di poter servire: si
// modifica sia in preparazione sia a festa già avviata, per aggiungere
// o togliere qualcosa al volo
export async function setPartyMenu({ code, drinkIds }) {
    const cleaned = [...new Set((drinkIds ?? []).filter((id) => typeof id === "string" && id))].slice(0, 200);

    await updateDoc(partyRef(code), { menuDrinkIds: cleaned, updatedAt: serverTimestamp() });
}

// la stima degli invitati si corregge dalla scheda "Spesa": cambia solo
// quante bottiglie comprare, non tocca né il menù né il bancone
export async function setPartyPeople({ code, people }) {
    await updateDoc(partyRef(code), {
        estimatedPeople: normalizeEstimatedPeople(people),
        updatedAt: serverTimestamp()
    });
}

export async function startParty({ code }) {
    await updateDoc(partyRef(code), { started: true, updatedAt: serverTimestamp() });
}

// il documento della festa non trascina via da solo le sue sotto-collection:
// vanno cancellate a mano prima, e il documento festa per ultimo. Le regole
// per cancellare un partecipante/ordine controllano "chi e' l'host adesso"
// leggendo ancora il documento festa, quindi finche' non e' sparito lui
export async function deleteParty({ code }) {
    const normalized = normalizePartyCode(code);

    const [participantsSnapshot, ordersSnapshot] = await Promise.all([
        getDocs(participantsRef(normalized)),
        getDocs(ordersRef(normalized))
    ]);

    const refs = [
        ...participantsSnapshot.docs.map((document) => document.ref),
        ...ordersSnapshot.docs.map((document) => document.ref),
        inventoryRef(normalized)
    ];

    // il limite di firestore e' 500 scritture per batch: una festa vera non
    // ci si avvicina, ma spezzo comunque per non fidarmi del caso raro
    for (let start = 0; start < refs.length; start += 400) {
        const batch = writeBatch(db);

        refs.slice(start, start + 400).forEach((ref) => batch.delete(ref));

        await batch.commit();
    }

    await deleteDoc(partyRef(normalized));
}

export async function placeOrder({ code, user, drink }) {
    if (!user || !drink?.id) {
        throw new PartyError("Ordine senza drink o senza chi lo chiede.");
    }

    const [inventorySnapshot, party] = await Promise.all([getDoc(inventoryRef(code)), fetchParty(code)]);
    const inventory = normalizePartyInventory(
        inventorySnapshot.exists() ? inventorySnapshot.data() : emptyPartyInventory()
    );

    if (Array.isArray(party?.menuDrinkIds) && !party.menuDrinkIds.includes(drink.id)) {
        throw new PartyError("Questo drink non è nel menù della festa.");
    }

    if (inventory.removedDrinks.includes(drink.id)) {
        throw new PartyError("Il bar ha tolto questo drink dal bancone: non si può più ordinare.");
    }

    await setDoc(doc(ordersRef(code)), {
        drinkId: drink.id,
        drinkName: drink.name || "Senza nome",
        requestedBy: user.uid,
        requestedByName: displayNameOf(user),
        status: ORDER_QUEUED,
        preparedBy: "",
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp()
    });
}

// svuota solo lo storico (pronti/annullati): la coda ancora aperta non
// la tocco. Le regole fanno cancellare gli ordini solo all'host, quindi
// non basta essere bar per vedere il pulsante
export async function clearOrderHistory({ code }) {
    const normalized = normalizePartyCode(code);

    const snapshot = await getDocs(
        query(ordersRef(normalized), where("status", "in", [ORDER_READY, ORDER_CANCELLED]))
    );

    for (let start = 0; start < snapshot.docs.length; start += 400) {
        const batch = writeBatch(db);

        snapshot.docs.slice(start, start + 400).forEach((document) => batch.delete(document.ref));

        await batch.commit();
    }
}

export async function startOrder({ code, orderId, user }) {
    await updateDoc(orderRef(code, orderId), {
        status: ORDER_PREPARING,
        preparedBy: user?.uid ?? "",
        updatedAt: serverTimestamp()
    });
}

export async function cancelOrder({ code, orderId }) {
    await updateDoc(orderRef(code, orderId), {
        status: ORDER_CANCELLED,
        updatedAt: serverTimestamp()
    });
}

// il passaggio delicato: quando l'ordine diventa "pronto" scalo davvero
// l'inventario. leggo la ricetta dal documento del drink e non da quello
// che ha scritto il cliente nell'ordine, e faccio tutto in transazione
// così due bartender sull'ultimo bicchiere non vanno in negativo
export async function serveOrder({ code, order, user }) {
    if (!order?.id || !order?.drinkId) {
        throw new PartyError("Ordine incompleto: non so cosa scalare.");
    }

    await runTransaction(db, async (transaction) => {
        const currentOrderRef = orderRef(code, order.id);
        const currentInventoryRef = inventoryRef(code);

        const orderSnapshot = await transaction.get(currentOrderRef);
        const drinkSnapshot = await transaction.get(doc(db, "drinks", order.drinkId));
        const inventorySnapshot = await transaction.get(currentInventoryRef);

        if (!orderSnapshot.exists()) {
            throw new PartyError("Questo ordine non c'è più.");
        }

        const currentStatus = orderSnapshot.data().status;

        if (currentStatus === ORDER_READY) {
            throw new PartyError("Qualcun altro l'ha già segnato come pronto.");
        }

        if (currentStatus === ORDER_CANCELLED) {
            throw new PartyError("Questo ordine è stato annullato.");
        }

        if (!drinkSnapshot.exists()) {
            throw new PartyError("La ricetta non esiste più: non riesco a scalare l'inventario.");
        }

        const result = consumeDrink(
            inventorySnapshot.exists() ? inventorySnapshot.data() : emptyPartyInventory(),
            drinkSnapshot.data().ingredients
        );

        if (!result.ok) {
            throw new PartyError(`Non basta più: manca ${missingLabel(result.missing)}.`);
        }

        transaction.set(currentInventoryRef, {
            amounts: result.inventory.amounts,
            extras: result.inventory.extras,
            removedDrinks: result.inventory.removedDrinks,
            updatedAt: serverTimestamp()
        });

        transaction.update(currentOrderRef, {
            status: ORDER_READY,
            preparedBy: user?.uid ?? "",
            updatedAt: serverTimestamp()
        });
    });
}
