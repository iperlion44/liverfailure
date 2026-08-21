import { getFirestore } from "firebase/firestore";
import app from "./firebaseconfig";

const db = getFirestore(app);

export default db;