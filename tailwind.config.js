/** @type {import('tailwindcss').Config} */
// Veste "manifesto svizzero" (stessa di Wishlist Viaggi ed Expense Track):
// colori pieni, inchiostro nero, righe sottili, pillole. Un solo tema, chiaro.
// Guida completa: Downloads/APP/wishlist-viaggi/docs/LINEE-GUIDA-DESIGN.md.

// Colore pieno della schermata aperta: lo imposta setPageColor (terna RGB in
// --sfondo), così `bg-sfondo` segue la pagina senza toccare i componenti.
const sfondo = "rgb(var(--sfondo) / <alpha-value>)";
// Inchiostro trasparente: su qualsiasi colore pieno resta leggibile e prende
// la tinta del fondo (un grigio fisso sul giallo o sull'arancio sporcherebbe).
const inkA = (a) => `rgb(10 10 10 / calc(<alpha-value> * ${a}))`;

export default {
  content: ["./index.html", "./src/**/*.{js,jsx}"],
  theme: {
    extend: {
      colors: {
        sfondo,
        ink: "rgb(10 10 10 / <alpha-value>)",
        white: "#ffffff",
        crema: "#f3f1ec", // "bianco caldo" del testo su nero
        carta: "#efede8",
        tenue: inkA(0.6), // etichette e testi secondari
        riga: inkA(0.16), // fili sottili tra le righe
        // Colori pieni (sopra si scrive in nero; bianco solo sul rosso azione)
        arancio: "#ff7a1a", // marchio: Dispensa, accesso, avvio, icona
        giallo: "#ffd60a",
        verde: "#22b35e",
        rosa: "#ffb5d0",
        sabbia: "#dccdb2",
        blu: "#3572e8",
        grigio: "#c9c5bd",
        rosso: {
          DEFAULT: "#ff3b1c",
          azione: "#e02a0d", // ciò che toglie (regge il testo bianco)
          elimina: "#d8241a", // fondo dietro lo swipe "Elimina"
        },
        errore: "#c21d05",
      },
      fontFamily: {
        sans: ['"Inter Tight Variable"', '"Helvetica Neue"', "Helvetica", "Arial", "system-ui", "sans-serif"],
      },
      letterSpacing: {
        titolo: "-0.065em",
        numero: "-0.06em",
        grande: "-0.045em",
      },
      borderRadius: {
        foglio: "28px",
        card: "18px",
        riga: "14px",
      },
      boxShadow: {
        card: "0 6px 18px rgb(0 0 0 / .1)",
        ricerca: "0 14px 34px rgb(0 0 0 / .12)",
        popover: "0 12px 30px rgb(0 0 0 / .16)",
        barra: "0 8px 30px rgb(0 0 0 / .25)",
      },
    },
  },
  plugins: [],
};
