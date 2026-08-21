import { Link } from "react-router-dom";

import { useAuth } from "../context/AuthContext";
import { initialOf } from "../utils/drink";

function UserMenu() {
    const { user } = useAuth();

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
            {initialOf(user)}
        </Link>
    );
}

export default UserMenu;
