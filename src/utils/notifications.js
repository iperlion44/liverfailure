function isSupported() {
    return typeof window !== "undefined" && "Notification" in window;
}

//miglioramento dell'IA:
// safari a volte lancia errore se non parte da un click dell'utente,
// e comunque il salvataggio del drink non deve dipendere dalla notifica
export async function requestNotificationPermission() {
    if (!isSupported()) {
        return false;
    }

    if (Notification.permission !== "default") {
        return Notification.permission === "granted";
    }

    try {
        const permission = await Notification.requestPermission();

        return permission === "granted";
    } catch (error) {
        console.error("Permesso notifiche non richiedibile:", error);
        return false;
    }
}
//fine miglioramento dell'IA

// su android il costruttore Notification non funziona, va usato il
// service worker. provo quella strada prima e tengo il costruttore
// come fallback per desktop
async function display(title, body) {
    if ("serviceWorker" in navigator) {
        try {
            const registration = await navigator.serviceWorker.ready;

            await registration.showNotification(title, { body });
            return;
        } catch (error) {
            console.error("Notifica dal service worker non riuscita:", error);
        }
    }

    new Notification(title, { body });
}

export async function showNotification(title, body) {
    if (!isSupported()) {
        return;
    }

    const granted = await requestNotificationPermission();

    if (!granted) {
        return;
    }

    try {
        await display(title, body);
    } catch (error) {
        console.error("Notifica non mostrata:", error);
    }
}
