/** @type {import('tailwindcss').Config} */
export default {
  content: ["./index.html", "./src/**/*.{js,jsx}"],
  theme: {
    extend: {
      colors: {
        // Stile X · Editoriale (fondo bianco)
        cream: "#ffffff",      // tela di fondo (bianco)
        paper: "#ffffff",
        ink: "#1a1a1a",        // testo principale
        hair: "#ececec",       // righe sottili / bordi
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
        display: ['"Hanken Grotesk"', "system-ui", "-apple-system", "sans-serif"],
      },
    },
  },
  plugins: [],
};
