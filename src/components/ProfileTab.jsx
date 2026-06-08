// Scheda Profilo: saluto, email dell'utente, logout e info app.
import { LogOut, Mail } from "lucide-react";

export default function ProfileTab({ email, onLogout }) {
  return (
    <div className="pt-2">
      <h1 className="font-display text-4xl font-semibold leading-none text-ink">Profilo</h1>

      <div className="mt-6 rounded-2xl border border-hair bg-paper p-4">
        <div className="flex items-center gap-3">
          <span className="flex h-11 w-11 items-center justify-center rounded-xl bg-tomato/10 text-tomato">
            <Mail className="h-5 w-5" />
          </span>
          <div className="min-w-0">
            <div className="text-[11px] font-semibold uppercase tracking-wider text-stone-400">Account</div>
            <div className="truncate text-sm font-medium text-ink">{email || "—"}</div>
          </div>
        </div>
      </div>

      <button
        onClick={onLogout}
        className="mt-4 flex w-full items-center justify-center gap-2 rounded-2xl border border-hair bg-paper px-4 py-3 text-sm font-semibold text-tomato transition hover:bg-tomato/5"
      >
        <LogOut className="h-4 w-4" /> Esci
      </button>

      <p className="mt-6 text-center text-xs text-stone-400">La Mia Dispensa · v0.1</p>
    </div>
  );
}
