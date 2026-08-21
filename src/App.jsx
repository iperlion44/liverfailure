import { useEffect } from "react";

import AppRoutes from "./routes";
import { requestNotificationPermission } from "./utils/notifications";

export default function App() {
    useEffect(() => {
        requestNotificationPermission();
    }, []);

    return <AppRoutes />;
}
