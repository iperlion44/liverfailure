export const MAX_IMAGE_SIZE = 8 * 1024 * 1024;

const MAX_DIMENSION = 900;
const JPEG_QUALITY = 0.75;

// firestore ha un limite di 1 MiB a documento, quindi tengo l'immagine
// bella sotto per lasciare spazio agli altri campi
const MAX_STORED_SIZE = 700 * 1024;

// lato del quadrato salvato per la foto profilo: non serve tenerla
// piu' grande perche' in giro viene sempre mostrata piccola e rotonda
const PROFILE_PHOTO_SIZE = 480;

export function validateDrinkImage(file) {
    if (!file.type.startsWith("image/")) {
        return "Il file scelto non è un'immagine.";
    }

    if (file.size > MAX_IMAGE_SIZE) {
        return "L'immagine è troppo grande: al massimo 8 MB.";
    }

    return "";
}

// le foto fatte col telefono hanno un tag EXIF che dice come vanno
// ruotate, e su alcuni browser mobile se non lo applichi prima di
// disegnare sul canvas l'immagine viene fuori tutta schiacciata.
// con imageOrientation: "from-image" dovrebbe pensarci il browser
async function loadOrientedSource(file) {
    if (typeof createImageBitmap === "function") {
        try {
            const bitmap = await createImageBitmap(file, { imageOrientation: "from-image" });
            return { source: bitmap, width: bitmap.width, height: bitmap.height };
        } catch {
            // se non va, provo con il metodo vecchio sotto
        }
    }

    const dataUrl = await new Promise((resolve, reject) => {
        const reader = new FileReader();
        reader.onerror = () => reject(reader.error ?? new Error("Immagine non leggibile"));
        reader.onload = () => resolve(reader.result);
        reader.readAsDataURL(file);
    });

    const img = await new Promise((resolve, reject) => {
        const image = new Image();
        image.onerror = () => reject(new Error("Immagine non leggibile"));
        image.onload = () => resolve(image);
        image.src = dataUrl;
    });

    return { source: img, width: img.width, height: img.height };
}

// ridimensiona e comprime l'immagine sul client, poi la ritorna come
// data URL così la salvo direttamente nel documento (non uso uno
// storage a parte, tanto vale tenerla semplice)
export async function readDrinkImage(file) {
    const { source, width, height } = await loadOrientedSource(file);

    const scale = Math.min(1, MAX_DIMENSION / Math.max(width, height));

    const canvas = document.createElement("canvas");
    canvas.width = Math.max(1, Math.round(width * scale));
    canvas.height = Math.max(1, Math.round(height * scale));

    const context = canvas.getContext("2d");

    if (!context) {
        throw new Error("Canvas non disponibile");
    }

    // il jpeg non ha trasparenza, quindi metto uno sfondo bianco
    // altrimenti le parti trasparenti di png/webp diventano nere
    context.fillStyle = "#FFFFFF";
    context.fillRect(0, 0, canvas.width, canvas.height);
    context.drawImage(source, 0, 0, canvas.width, canvas.height);

    if (source.close) {
        source.close();
    }

    const dataUrl = canvas.toDataURL("image/jpeg", JPEG_QUALITY);

    if (dataUrl.length > MAX_STORED_SIZE) {
        throw new Error("Immagine troppo pesante dopo la compressione");
    }

    return dataUrl;
}

// per la foto profilo non ridimensiono e basta come per i drink: ritaglio
// il quadrato centrale (nessun'altra modifica) così quando viene mostrata
// rotonda con CSS è sempre un ritaglio circolare della parte centrale
// della foto originale, senza bande bianche o distorsioni ai lati
export async function readProfilePhoto(file) {
    const { source, width, height } = await loadOrientedSource(file);

    const side = Math.min(width, height);
    const offsetX = (width - side) / 2;
    const offsetY = (height - side) / 2;
    const targetSize = Math.min(PROFILE_PHOTO_SIZE, side);

    const canvas = document.createElement("canvas");
    canvas.width = targetSize;
    canvas.height = targetSize;

    const context = canvas.getContext("2d");

    if (!context) {
        throw new Error("Canvas non disponibile");
    }

    // niente trasparenza: se la foto ce l'ha (png/webp), sotto ci va bianco
    context.fillStyle = "#FFFFFF";
    context.fillRect(0, 0, canvas.width, canvas.height);
    context.drawImage(source, offsetX, offsetY, side, side, 0, 0, targetSize, targetSize);

    if (source.close) {
        source.close();
    }

    const dataUrl = canvas.toDataURL("image/jpeg", JPEG_QUALITY);

    if (dataUrl.length > MAX_STORED_SIZE) {
        throw new Error("Immagine troppo pesante dopo la compressione");
    }

    return dataUrl;
}
