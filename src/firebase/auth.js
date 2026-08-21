import { getAuth } from "firebase/auth";
import app from "./firebaseconfig";

const auth = getAuth(app);

export default auth;