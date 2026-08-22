import { doc, getDoc, setDoc } from "firebase/firestore";

import db from "../firebase/firestore";

// Salvata in Firestore come data URL: il campo photoURL di Firebase
// Auth ha un limite di lunghezza troppo basso per un'immagine inline.
export async function fetchProfilePhoto(uid) {
    if (!uid) {
        return "";
    }

    const snapshot = await getDoc(doc(db, "users", uid));

    return snapshot.exists() ? snapshot.data().photoURL || "" : "";
}

export async function saveProfilePhoto(uid, photoURL) {
    await setDoc(doc(db, "users", uid), { photoURL }, { merge: true });
}
