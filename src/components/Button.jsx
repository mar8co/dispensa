// Bottone d'azione condiviso: lo stile vive QUI, coerente per FUNZIONE — così
// non si ridivergono schermata per schermata (stesso spirito di Sheet.jsx).
// I bottoni "speciali" restano bespoke (FAB, otturatore fotocamera, navbar,
// stepper ± , chip/pill), perché non sono azioni testuali standard.
//
// Varianti (per funzione, non per look):
//  - primary    pieno tomato — conferma/commit (la CTA principale di una vista)
//  - secondary  outline neutro — alternativa / Annulla
//  - cook       tinta tomato — azioni "genera/cucina" (AI)
//  - danger     outline tomato — eliminazioni
// size: md (default) · lg (CTA prominente) · sm (compatto, text-xs).
// full: larghezza piena. className: override di layout (es. flex-1, mt-7).
// Il testo bianco sui pieni è LETTERALE (#fff) per non scurirsi in dark mode.
const BASE =
  "inline-flex items-center justify-center gap-2 rounded-xl font-semibold transition active:scale-[0.99] disabled:opacity-60 disabled:pointer-events-none";

const VARIANTS = {
  primary: "bg-tomato text-[#fff] hover:bg-tomato-700",
  secondary: "border-[1.5px] border-hair bg-paper text-ink hover:bg-stone-50",
  cook: "border-[1.5px] border-tomato/50 bg-tomato/5 text-tomato hover:bg-tomato/10",
  danger: "border-[1.5px] border-tomato/40 bg-paper text-tomato hover:bg-tomato/5",
};

const SIZES = {
  sm: "px-3 py-2.5 text-xs",
  md: "px-4 py-3 text-sm",
  lg: "px-4 py-3.5 text-sm",
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
    BASE,
    VARIANTS[variant] || VARIANTS.primary,
    SIZES[size] || SIZES.md,
    full ? "w-full" : "",
    className,
  ].join(" ").replace(/\s+/g, " ").trim();
  return (
    <button type={type} className={cls} {...props}>
      {children}
    </button>
  );
}
