import AppRoutes from "./routes";

// non chiedo il permesso per le notifiche all'avvio, safari lo rifiuta
// se non parte da un click. ci pensa showNotification al primo salvataggio
export default function App() {
    return <AppRoutes />;
}
