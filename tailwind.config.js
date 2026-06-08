/** @type {import('tailwindcss').Config} */
export default {
  content: ["./index.html", "./src/**/*.{js,jsx}"],
  theme: {
    extend: {
      colors: {
        // Stile X · Editoriale
        cream: "#faf7f2",      // tela di fondo
        paper: "#ffffff",
        ink: "#1a1a1a",        // testo principale
        hair: "#ece8e1",       // righe sottili / bordi
        tomato: {
          DEFAULT: "#d6442f",  // accento
          50: "#fdf3f1",
          100: "#fbe3de",
          600: "#d6442f",
          700: "#b8351f",
        },
      },
      fontFamily: {
        sans: ['"Hanken Grotesk"', "system-ui", "-apple-system", "sans-serif"],
        display: ["Fraunces", "Georgia", "serif"],
      },
    },
  },
  plugins: [],
};
