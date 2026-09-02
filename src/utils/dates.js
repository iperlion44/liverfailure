// le date arrivano da firestore come Timestamp, dalla cache locale come
// stringa e dal codice come Date: le riporto tutte a Date prima di
// provare a formattarle
export function toDate(value) {
    if (!value) {
        return null;
    }

    if (value instanceof Date) {
        return Number.isNaN(value.getTime()) ? null : value;
    }

    if (typeof value.toDate === "function") {
        try {
            return toDate(value.toDate());
        } catch (error) {
            console.error("Data non convertibile:", error);
            return null;
        }
    }

    if (typeof value.seconds === "number") {
        return toDate(new Date(value.seconds * 1000));
    }

    if (typeof value === "string" || typeof value === "number") {
        return toDate(new Date(value));
    }

    return null;
}

const MINUTE = 60 * 1000;
const HOUR = 60 * MINUTE;
const DAY = 24 * HOUR;

export function formatRelativeDate(value, now = new Date()) {
    const date = toDate(value);

    if (!date) {
        return "";
    }

    const elapsed = now.getTime() - date.getTime();

    // se l'orologio del dispositivo è indietro la data può risultare
    // nel futuro: dire "adesso" è meno strano di "-3 minuti fa"
    if (elapsed < MINUTE) {
        return "adesso";
    }

    if (elapsed < HOUR) {
        const minutes = Math.floor(elapsed / MINUTE);

        return minutes === 1 ? "1 minuto fa" : `${minutes} minuti fa`;
    }

    if (elapsed < DAY) {
        const hours = Math.floor(elapsed / HOUR);

        return hours === 1 ? "1 ora fa" : `${hours} ore fa`;
    }

    const days = Math.floor(elapsed / DAY);

    if (days === 1) {
        return "ieri";
    }

    if (days < 30) {
        return `${days} giorni fa`;
    }

    return formatDate(date);
}

export function formatDate(value) {
    const date = toDate(value);

    if (!date) {
        return "";
    }

    return date.toLocaleDateString("it-IT", {
        day: "numeric",
        month: "long",
        year: "numeric"
    });
}

export function formatTime(value) {
    const date = toDate(value);

    if (!date) {
        return "";
    }

    return date.toLocaleTimeString("it-IT", { hour: "2-digit", minute: "2-digit" });
}
