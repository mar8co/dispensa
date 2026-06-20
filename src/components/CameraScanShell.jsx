// Guscio condiviso delle schermate di scansione (scontrino e codice a barre):
// una scheda che sale dal basso (bottom-sheet) su palette SCURA, con testata
// (icona/titolo/sottotitolo/chiusura), riquadro anteprima fotocamera e barra
// comandi. Non è a tutto schermo: l'altezza dell'anteprima è parametrica
// (`previewClass`), così lo scontrino può essere più grande del barcode.
// Testo/icone in bianco LETTERALE (#fff, non il token "white" che in dark si
// scurirebbe). Riusa Sheet per maniglia, trascina-per-chiudere e blocco scroll.
import { X } from "lucide-react";
import Sheet from "./Sheet.jsx";

export default function CameraScanShell({
  icon: Icon,
  title,
  subtitle,
  onClose,
  children,
  footer,
  previewClass = "h-[44vh]",
}) {
  return (
    <Sheet onClose={onClose} panelClass="bg-[#141414] text-[#fff]" handleClass="bg-[#fff]/30">
      {(close) => (
        <div className="flex flex-col px-4 pb-2">
          {/* Testata */}
          <div className="flex items-start justify-between gap-3 pb-3">
            <div className="min-w-0">
              <div className="flex items-center gap-2 text-base font-bold text-[#fff]">
                {Icon && <Icon className="h-5 w-5 shrink-0" />} {title}
              </div>
              {subtitle && (
                <div className="mt-0.5 text-xs font-medium text-[#fff]/70">{subtitle}</div>
              )}
            </div>
            <button
              onClick={close}
              aria-label="Chiudi"
              className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-[#fff]/10 text-[#fff] transition hover:bg-[#fff]/20"
            >
              <X className="h-5 w-5" />
            </button>
          </div>

          {/* Anteprima fotocamera + overlay (riquadro guida, hint, ecc.) */}
          <div className={`relative overflow-hidden rounded-2xl bg-black ${previewClass}`}>
            {children}
          </div>

          {/* Barra comandi */}
          {footer && (
            <div className="relative mt-4 flex items-center justify-center">{footer}</div>
          )}
        </div>
      )}
    </Sheet>
  );
}
