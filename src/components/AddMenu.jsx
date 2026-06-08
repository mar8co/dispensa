// Menù di aggiunta (si apre dal "+" della barra in basso): i 4 modi per
// aggiungere prodotti alla dispensa.
import { Pencil, ScanBarcode, Mic, Camera, X } from "lucide-react";

function Option({ icon: Icon, title, desc, onClick }) {
  return (
    <button
      onClick={onClick}
      className="flex w-full items-center gap-3 rounded-2xl border border-hair bg-paper px-4 py-3 text-left transition active:scale-[0.99] hover:border-stone-300"
    >
      <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-tomato/10 text-tomato">
        <Icon className="h-5 w-5" />
      </span>
      <span className="min-w-0">
        <span className="block text-sm font-semibold text-ink">{title}</span>
        <span className="block text-xs text-stone-500">{desc}</span>
      </span>
    </button>
  );
}

export default function AddMenu({ onClose, onManual, onBarcode, onVoice, onPhoto }) {
  return (
    <div className="fixed inset-0 z-40 flex items-end justify-center bg-black/40 sm:items-center sm:p-4" onClick={onClose}>
      <div
        className="w-full max-w-md rounded-t-3xl bg-cream p-5 pb-7 shadow-xl sm:rounded-3xl"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="mb-3 flex items-center justify-between">
          <h3 className="font-display text-xl font-semibold text-ink">Aggiungi alla dispensa</h3>
          <button onClick={onClose} className="rounded-lg p-1.5 text-stone-400 hover:bg-stone-100">
            <X className="h-5 w-5" />
          </button>
        </div>
        <div className="space-y-2.5">
          <Option icon={Pencil} title="A mano" desc="Scrivi nome e quantità" onClick={onManual} />
          <Option icon={Camera} title="Foto" desc="Scontrino o spesa sul tavolo" onClick={onPhoto} />
          <Option icon={ScanBarcode} title="Codice a barre" desc="Inquadra il barcode" onClick={onBarcode} />
          <Option icon={Mic} title="A voce" desc='Dì cosa hai comprato' onClick={onVoice} />
        </div>
      </div>
    </div>
  );
}
