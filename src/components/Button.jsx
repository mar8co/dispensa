// Bottone d'azione condiviso: lo stile vive QUI (classi .bottone* di
// index.css), coerente per FUNZIONE — così non si ridivergono schermata per
// schermata (stesso spirito di Sheet.jsx). I bottoni "speciali" restano
// bespoke (FAB, otturatore fotocamera, navbar, stepper ±, chip/pill), perché
// non sono azioni testuali standard.
//
// Varianti (per funzione, non per look) — veste manifesto, tutte a pillola:
//  - primary    nero pieno — conferma/commit (UNA per schermata o foglio)
//  - secondary  col bordo — alternativa / Annulla
//  - cook       col bordo — azioni "genera/cucina" (AI), riconoscibili dall'icona
//  - danger     rosso pieno, testo bianco — ciò che toglie (elimina, esci)
// size: md (default, 50px) · lg (CTA prominente) · sm (compatto).
// full: larghezza piena. className: override di layout (es. flex-1, mt-7).
const VARIANTS = {
  primary: "bottone",
  secondary: "bottone-chiaro",
  cook: "bottone-chiaro",
  danger: "bottone-rosso",
};

const SIZES = {
  sm: "min-h-[42px] px-4 py-2 text-[0.9rem]",
  md: "",
  lg: "min-h-[56px] text-[1.05rem]",
};

export default function Button({
  variant = "primary",
  size = "md",
  full = false,
  className = "",
  type = "button",
  children,
  ...props
}) {
  const cls = [
    VARIANTS[variant] || VARIANTS.primary,
    SIZES[size] ?? "",
    full ? "w-full" : "",
    className,
  ].join(" ").replace(/\s+/g, " ").trim();
  return (
    <button type={type} className={cls} {...props}>
      {children}
    </button>
  );
}
