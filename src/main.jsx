import React from "react";
import ReactDOM from "react-dom/client";
import { registerSW } from "virtual:pwa-register";

import App from "./App";
import { AuthProvider } from "./context/AuthContext";
import { InventoryProvider } from "./context/InventoryContext";
import { PartyListProvider } from "./context/PartyListContext";

import "./styles/reset.css";
import "./styles/variables.css";
import "./styles/global.css";

registerSW({ immediate: true });

ReactDOM.createRoot(document.getElementById("root")).render(
    <React.StrictMode>
        <AuthProvider>
            <InventoryProvider>
                <PartyListProvider>
                    <App />
                </PartyListProvider>
            </InventoryProvider>
        </AuthProvider>
    </React.StrictMode>
);
