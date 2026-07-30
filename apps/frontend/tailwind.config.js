/** @type {import('tailwindcss').Config} */
export default {
  content: ["./index.html", "./src/**/*.{js,ts,jsx,tsx}"],
  theme: {
    extend: {
      colors: {
        // Fondo casi negro, pero no puro negro: se siente más "escenario de bar" que "pantalla apagada"
        base: "#0B0B0D",
        surface: "#161418",
        "surface-raised": "#201D22",
        border: "#2E2A30",
        // Texto casi blanco, no blanco puro (menos duro bajo luz de bar)
        ink: "#F3F1EE",
        "ink-muted": "#9C97A0",
        // Rojo profundo tipo cartel de concierto, no rojo neón de alerta
        rock: {
          DEFAULT: "#C5203D",
          bright: "#E23A56",
          dim: "#7A1526",
        },
      },
      fontFamily: {
        display: ["Oswald", "sans-serif"],
        body: ["Inter", "sans-serif"],
      },
    },
  },
  plugins: [],
};
