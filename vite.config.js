import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import { VitePWA } from "vite-plugin-pwa";

// react e il router cambiano solo quando aggiorno una dipendenza, quindi
// li metto in un chunk a parte: così un deploy con solo modifiche al
// codice mio non fa riscaricare ~230kb di libreria dal service worker
const VENDOR_CHUNKS = [
    { chunk: "vendor-react", packages: ["react", "react-dom", "scheduler"] },
    { chunk: "vendor-router", packages: ["react-router", "react-router-dom"] }
];

function vendorChunk(id) {
    const match = VENDOR_CHUNKS.find(({ packages }) =>
        packages.some((name) => id.includes(`/node_modules/${name}/`))
    );

    return match ? match.chunk : undefined;
}

export default defineConfig({
    plugins: [
        react(),
        VitePWA({
            registerType: "autoUpdate",
            includeAssets: ["favicon.ico"],
            manifest: {
                name: "LiverFailure",
                short_name: "LiverFailure",
                description: "Crea, condividi e salva i tuoi drink preferiti.",
                theme_color: "#FFFFFF",
                background_color: "#FFFFFF",
                display: "standalone",
                start_url: "/",
                icons: [
                    { src: "icon-192.png", sizes: "192x192", type: "image/png" },
                    { src: "icon-512.png", sizes: "512x512", type: "image/png" }
                ]
            },
            workbox: {
                globPatterns: ["**/*.{js,css,html,png,svg,ico}"]
            }
        })
    ],
    build: {
        rollupOptions: {
            output: {
                manualChunks: vendorChunk
            }
        }
    }
});
