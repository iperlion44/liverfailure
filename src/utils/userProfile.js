import { doc, getDoc, setDoc } from "firebase/firestore";

import db from "../firebase/firestore";

// La foto profilo va in Firestore (come data URL) e non nel campo
// photoURL di Firebase Auth, che ha un limite di lunghezza troppo
// basso per contenere un'immagine incorporata.
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
