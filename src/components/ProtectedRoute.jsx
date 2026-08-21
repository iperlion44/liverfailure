import { Navigate, Outlet } from "react-router-dom";

import { useAuth } from "../context/AuthContext";
import { Loader } from "./Loader";

function ProtectedRoute() {
    const { user, loading } = useAuth();

    if (loading) {
        return <Loader label="Controllo accesso" />;
    }

    if (!user) {
        return <Navigate to="/login" replace />;
    }

    return <Outlet />;
}

export default ProtectedRoute;
