export const MAX_IMAGE_SIZE = 8 * 1024 * 1024;

const MAX_DIMENSION = 900;
const JPEG_QUALITY = 0.75;

export function validateDrinkImage(file) {
    if (!file.type.startsWith("image/")) {
        return "Il file scelto non è un'immagine.";
    }

    if (file.size > MAX_IMAGE_SIZE) {
        return "L'immagine è troppo grande: al massimo 8 MB.";
    }

    return "";
}

// Ridimensiona e comprime la foto lato client, poi la restituisce come
// data URL da salvare direttamente nel documento Firestore (niente
// storage separato).
export function readDrinkImage(file) {
    return new Promise((resolve, reject) => {
        const reader = new FileReader();

        reader.onerror = () => reject(reader.error);

        reader.onload = () => {
            const img = new Image();

            img.onerror = () => reject(new Error("Immagine non leggibile"));

            img.onload = () => {
                const scale = Math.min(1, MAX_DIMENSION / Math.max(img.width, img.height));

                const canvas = document.createElement("canvas");
                canvas.width = Math.round(img.width * scale);
                canvas.height = Math.round(img.height * scale);

                const context = canvas.getContext("2d");
                context.drawImage(img, 0, 0, canvas.width, canvas.height);

                resolve(canvas.toDataURL("image/jpeg", JPEG_QUALITY));
            };

            img.src = reader.result;
        };

        reader.readAsDataURL(file);
    });
}
