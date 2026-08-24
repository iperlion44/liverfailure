import { useEffect, useState } from "react";
import { Link } from "react-router-dom";

import { useAuth } from "../context/useAuth";
import { initialOf } from "../utils/drink";
import { fetchProfilePhoto } from "../utils/userProfile";

function UserMenu() {
    const { user } = useAuth();
    const [photoURL, setPhotoURL] = useState("");

    useEffect(() => {
        if (!user) {
            return;
        }

        fetchProfilePhoto(user.uid)
            .then(setPhotoURL)
            .catch((error) => console.error(error));
    }, [user]);

    if (!user) {
        return null;
    }

    return (
        <Link
            to="/profile"
            className="avatar avatar-sm"
            title={user.displayName || user.email}
            aria-label="Vai al tuo profilo"
        >
            {photoURL ? <img className="avatar-photo" src={photoURL} alt="" /> : initialOf(user)}
        </Link>
    );
}

export default UserMenu;
