const QUOTA_ERROR_NAMES = new Set([
    "QuotaExceededError",
    "NS_ERROR_DOM_QUOTA_REACHED"
]);

function isQuotaError(error) {
    return Boolean(
        error && (QUOTA_ERROR_NAMES.has(error.name) || error.code === 22 || error.code === 1014)
    );
}

function withoutImages(items) {
    return items.map((item) => {
        if (!item || !item.image) {
            return item;
        }

        const withoutImage = { ...item };

        delete withoutImage.image;

        return withoutImage;
    });
}

// se non entra tutto riprovo senza le foto, tanto la ricetta in sé
// è la cosa che serve davvero offline
export function writeCache(storage, key, items, errorLabel) {
    try {
        storage.setItem(key, JSON.stringify(items));
        return true;
    } catch (error) {
        if (!isQuotaError(error)) {
            console.error(errorLabel, error);
            return false;
        }

        try {
            storage.setItem(key, JSON.stringify(withoutImages(items)));
            return true;
        } catch (retryError) {
            console.error(errorLabel, retryError);
            return false;
        }
    }
}
