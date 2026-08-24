import { createContext, useContext } from "react";

// tengo il contesto separato dal provider, sennò il fast refresh di
// vite si lamenta perché AuthContext.jsx esporterebbe anche un hook
export const AuthContext = createContext({ user: null, loading: true });

export function useAuth() {
    return useContext(AuthContext);
}
