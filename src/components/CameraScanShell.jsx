// Guscio condiviso delle schermate di scansione con fotocamera (scontrino e
// codice a barre): layout a tutto schermo su fondo nero, testata con
// icona/titolo/sottotitolo/chiusura e barra comandi opzionale in basso, en­trambe
// con scrim scuro e testo bianco LETTERALE (#fff, non il token "white" che è
// tematizzato e si scurirebbe in dark). Tiene i due scanner perfettamente
// coerenti: stile, palette e bordi vivono qui, una volta sola.
import { X } from "lucide-react";

export default function CameraScanShell({ icon: Icon, title, subtitle, onClose, children, footer }) {
  return (
    <div className="fixed inset-0 z-[60] flex flex-col bg-black">
      {/* Testata: scrim scuro per la leggibilità sopra la fotocamera */}
      <div
        className="z-10 flex items-center justify-between bg-gradient-to-b from-black/70 to-transparent px-4 pb-6 text-[#fff]"
        style={{ paddingTop: "calc(0.85rem + env(safe-area-inset-top))" }}
      >
        <div className="min-w-0 pr-3 drop-shadow">
          <div className="flex items-center gap-2 text-base font-bold">
            {Icon && <Icon className="h-5 w-5 shrink-0" />} {title}
          </div>
          {subtitle && (
            <div className="mt-0.5 text-xs font-medium text-[#fff]/80">{subtitle}</div>
          )}
        </div>
        <button
          onClick={onClose}
          className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-black/45 text-[#fff] backdrop-blur transition hover:bg-black/60"
          aria-label="Chiudi"
        >
          <X className="h-5 w-5" />
        </button>
      </div>

      {/* Area centrale: anteprima fotocamera + overlay (passati come children) */}
      <div className="relative flex-1 overflow-hidden">{children}</div>

      {/* Barra comandi in basso (scrim scuro) */}
      {footer && (
        <div
          className="relative z-10 flex items-center justify-center bg-gradient-to-t from-black/75 to-transparent px-6 pt-10"
          style={{ paddingBottom: "calc(1.6rem + env(safe-area-inset-bottom))" }}
        >
          {footer}
        </div>
      )}
    </div>
  );
}
