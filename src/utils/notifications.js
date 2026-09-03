function isSupported() {
    return typeof window !== "undefined" && "Notification" in window;
}

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

// su android il costruttore Notification non funziona, va usato il
// service worker. provo quella strada prima e tengo il costruttore
// come fallback per desktop
//
// in dev (o se il service worker non è mai stato attivato sulla pagina)
// "navigator.serviceWorker.ready" non si risolve mai, quindi senza
// timeout la notifica resta bloccata per sempre invece di cadere sul
// fallback
async function display(title, body) {
    if ("serviceWorker" in navigator) {
        try {
            const registration = await Promise.race([
                navigator.serviceWorker.ready,
                new Promise((_, reject) =>
                    setTimeout(() => reject(new Error("Service worker non pronto in tempo")), 2000)
                )
            ]);

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
