export async function requestNotificationPermission() {
    if (!("Notification" in window)) {
        return false;
    }

    const permission = await Notification.requestPermission();

    return permission === "granted";
}

export async function showNotification(title, body) {
    if (!("Notification" in window)) {
        return;
    }

    if (Notification.permission === "default") {
        await requestNotificationPermission();
    }

    if (Notification.permission !== "granted") {
        return;
    }

    new Notification(title, { body });
}
