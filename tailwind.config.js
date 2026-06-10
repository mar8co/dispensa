/** @type {import('tailwindcss').Config} */
// I colori puntano alle variabili CSS di index.css (terne RGB): così la
// modalità scura ribalta tutta la palette senza toccare i componenti.
const v = (name) => `rgb(var(--${name}) / <alpha-value>)`;

export default {
  content: ["./index.html", "./src/**/*.{js,jsx}"],
  theme: {
    extend: {
      colors: {
        // Stile X · Editoriale (fondo bianco; scuro automatico da sistema)
        cream: v("cream"),
        paper: v("paper"),
        ink: v("ink"),
        hair: v("hair"),
        // "white" segue il tema: superfici bianche e testi su ink/tomato
        // diventano scuri in dark mode. Il nero (scrim) resta letterale.
        white: v("white"),
        tomato: {
          DEFAULT: v("tomato"),
          50: v("tomato-50"),
          100: v("tomato-100"),
          600: v("tomato"),
          700: v("tomato-700"),
        },
        stone: {
          50: v("stone-50"),
          100: v("stone-100"),
          200: v("stone-200"),
          300: v("stone-300"),
          400: v("stone-400"),
          500: v("stone-500"),
          600: v("stone-600"),
          700: v("stone-700"),
          800: v("stone-800"),
          900: v("stone-900"),
        },
        amber: {
          100: v("amber-100"),
          700: v("amber-700"),
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
