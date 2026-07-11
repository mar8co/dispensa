// Soft-ask contestuale per le notifiche di scadenza. Compare SOTTO il banner
// "in scadenza" della Dispensa, cioè proprio nel momento in cui il beneficio è
// ovvio ("hai prodotti che scadono → vuoi che ti avvisi?"). È un SECONDO punto
// d'accesso, non un sostituto del toggle nel Profilo (che resta il controllo
// durevole con il selettore dei giorni).
//
// Regole UX rispettate:
//  - mai all'avvio, solo in contesto (lo monta PantryTab quando c'è il banner);
//  - una volta sola: "Non ora" (o l'attivazione) lo silenzia per sempre su
//    questo dispositivo (flag localStorage);
//  - solo dove le push funzionano davvero (PWA installata → PushManager) e se
//    non sono già attive qui.
import { useEffect, useState } from "react";
import { Bell, Loader2 } from "lucide-react";
import Button from "./Button.jsx";
import { pushSupported, getPushState, enablePush } from "../lib/push.js";

const DISMISS_KEY = "dispensa-pushnudge-dismissed";

export default function PushNudge() {
  const [ready, setReady] = useState(false); // controllo iniziale completato
  const [show, setShow] = useState(false); // da mostrare?
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState("");

  useEffect(() => {
    let alive = true;
    const dismissed = (() => {
      try { return localStorage.getItem(DISMISS_KEY) === "1"; } catch { return false; }
    })();
    if (!pushSupported() || dismissed) { setReady(true); return; }
    // Mostra solo se non sono già attive su questo dispositivo.
    getPushState()
      .then((s) => { if (alive) { setShow(!s.enabled); setReady(true); } })
      .catch(() => { if (alive) setReady(true); });
    return () => { alive = false; };
  }, []);

  function silence() {
    try { localStorage.setItem(DISMISS_KEY, "1"); } catch { /* */ }
    setShow(false);
  }

  async function activate() {
    if (busy) return;
    setErr(""); setBusy(true);
    try {
      await enablePush();
      silence(); // attivate: non riproporre più il soft-ask
    } catch (e) {
      if (e?.code === "denied") setErr("Permesso negato. Puoi attivarle dal Profilo.");
      else setErr("Attivazione non riuscita. Riprova.");
    } finally {
      setBusy(false);
    }
  }

  if (!ready || !show) return null;

  return (
    <div className="mt-2 rounded-xl border border-hair bg-paper p-3">
      <div className="flex items-start gap-2.5">
        <span className="mt-0.5 flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-tomato/10 text-tomato">
          <Bell className="h-4 w-4" />
        </span>
        <div className="min-w-0 flex-1">
          <p className="text-sm font-semibold text-ink">Ti avviso prima che scadano?</p>
          <p className="text-xs text-stone-500">Un promemoria sul telefono, così non sprechi nulla.</p>
          {err && <p className="mt-1.5 text-xs font-semibold text-tomato">{err}</p>}
          <div className="mt-2.5 flex gap-2">
            <Button variant="primary" size="sm" onClick={activate} disabled={busy}>
              {busy ? <Loader2 className="h-4 w-4 animate-spin" /> : "Attiva"}
            </Button>
            <Button variant="secondary" size="sm" onClick={silence}>Non ora</Button>
          </div>
        </div>
      </div>
    </div>
  );
}
