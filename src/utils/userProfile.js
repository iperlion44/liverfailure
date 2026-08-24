import { doc, getDoc, setDoc } from "firebase/firestore";

import db from "../firebase/firestore";

//consiglio da IA:
// la salvo in firestore come data URL perché il campo photoURL di
// firebase auth è troppo corto per farci stare un'immagine intera
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
