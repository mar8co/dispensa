// Guscio condiviso delle schermate di scansione (scontrino e codice a barre):
// una scheda che sale dal basso (bottom-sheet) su palette SCURA, con testata
// (icona/titolo/sottotitolo/chiusura), riquadro anteprima fotocamera e barra
// comandi. Non è a tutto schermo: l'altezza dell'anteprima è parametrica
// (`previewClass`), così lo scontrino può essere più grande del barcode.
// Resta scura (nero, come la fotocamera) anche nella veste manifesto; l'accento
// "a fuoco / fatto" è il giallo (nero sopra). Riusa Sheet per maniglia,
// trascina-per-chiudere e blocco scroll.
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
    <Sheet onClose={onClose} panelClass="bg-ink text-crema" handleClass="bg-crema/30">
      {(close) => (
        <div className="flex flex-col px-4 pb-2">
          {/* Testata */}
          <div className="flex items-start justify-between gap-3 pb-3">
            <div className="min-w-0">
              <div className="flex items-center gap-2 text-[1.35rem] font-extrabold tracking-[-0.04em] text-crema">
                {Icon && <Icon className="h-5 w-5 shrink-0" />} {title}
              </div>
              {subtitle && (
                <div className="mt-0.5 text-[0.8rem] font-medium text-crema/70">{subtitle}</div>
              )}
            </div>
            <button
              onClick={close}
              aria-label="Chiudi"
              className="tondo border-crema text-crema"
            >
              <X className="h-5 w-5" />
            </button>
          </div>

          {/* Anteprima fotocamera + overlay (riquadro guida, hint, ecc.) */}
          <div className={`relative overflow-hidden rounded-card bg-black ${previewClass}`}>
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
