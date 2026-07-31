import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import { VitePWA } from "vite-plugin-pwa";

export default defineConfig({
  plugins: [
    react(),
    VitePWA({
      registerType: "autoUpdate",
      includeAssets: ["favicon.svg"],
      manifest: {
        name: "Barranke Rock POS",
        short_name: "BarrankeRock",
        description: "Sistema de punto de venta de Barranke Rock Café Bar",
        lang: "es",
        theme_color: "#C5203D",
        background_color: "#0B0B0D",
        display: "standalone",
        orientation: "portrait",
        start_url: "/",
        scope: "/",
        icons: [
          { src: "pwa-192.png", sizes: "192x192", type: "image/png" },
          { src: "pwa-512.png", sizes: "512x512", type: "image/png" },
          { src: "pwa-512-maskable.png", sizes: "512x512", type: "image/png", purpose: "maskable" },
        ],
      },
      workbox: {
        // Cachea el "cascarón" de la app (JS, CSS, fuentes) para que abra rápido
        // y no quede en blanco ante un corte breve de wifi. Las llamadas a /api/*
        // NUNCA se cachean: los datos del POS (mesas, pedidos, inventario) siempre
        // deben venir frescos del servidor, nunca de una copia vieja guardada.
        globPatterns: ["**/*.{js,css,html,woff,woff2,svg,png}"],
        navigateFallbackDenylist: [/^\/api\//],
      },
    }),
  ],
  server: {
    port: 5173,
  },
});
