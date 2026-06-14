// Store globale dei timer di cottura: vivono fuori dai componenti, così
// continuano (e suonano) anche cambiando scheda dentro l'app. Persistiti in
// localStorage per sopravvivere a chiusure/riaperture.
//
// Limite web invariato: a telefono bloccato o app chiusa non può suonare;
// il recupero avviene al ritorno in primo piano (checkTimers).

// --- Audio: AudioContext condiviso, sbloccato al primo "Avvia" (gesto). ---
let sharedCtx = null;
export function unlockAudio() {
  try {
    if (!sharedCtx) sharedCtx = new (window.AudioContext || window.webkitAudioContext)();
    if (sharedCtx.state === "suspended") sharedCtx.resume();
  } catch { /* niente audio */ }
}
// Una "raffica" di tre bip acuti (più udibile di un bip singolo).
function beep() {
  try {
    if (!sharedCtx) sharedCtx = new (window.AudioContext || window.webkitAudioContext)();
    if (sharedCtx.state === "suspended") sharedCtx.resume();
    const ctx = sharedCtx;
    [0, 0.32, 0.64].forEach((t) => {
      const o = ctx.createOscillator();
      const g = ctx.createGain();
      o.connect(g); g.connect(ctx.destination);
      o.type = "sine"; o.frequency.value = 940;
      g.gain.setValueAtTime(0.001, ctx.currentTime + t);
      g.gain.exponentialRampToValueAtTime(0.5, ctx.currentTime + t + 0.04);
      g.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + t + 0.26);
      o.start(ctx.currentTime + t); o.stop(ctx.currentTime + t + 0.3);
    });
  } catch { /* niente audio */ }
}

// --- Allarme: suona a raffiche ripetute + vibra, finché non si interagisce
//     o per un tempo ragionevole (~30s). ---
let alarmInt = null;
let alarmStop = null;
function vibrate() {
  try { navigator.vibrate?.([400, 200, 400, 200, 600]); } catch { /* */ }
}
function startAlarm() {
  stopAlarm();
  beep(); vibrate();
  alarmInt = setInterval(() => { beep(); vibrate(); }, 2000);
  alarmStop = setTimeout(stopAlarm, 30000);
}
export function stopAlarm() {
  if (alarmInt) { clearInterval(alarmInt); alarmInt = null; }
  if (alarmStop) { clearTimeout(alarmStop); alarmStop = null; }
  try { navigator.vibrate?.(0); } catch { /* */ }
}

function notify(label) {
  try {
    if ("Notification" in window && Notification.permission === "granted") {
      new Notification("⏱️ Tempo scaduto!", {
        body: label ? `“${label}” è pronto.` : "Il tuo timer è finito.",
        icon: "/pwa-192x192.png",
        badge: "/pwa-192x192.png",
        tag: "dispensa-timer",
        renotify: true,
        vibrate: [400, 200, 400],
      });
    }
  } catch { /* niente notifica */ }
}

// --- Stato ---
const KEY = "dispensa-timers";
let timers = {};   // id -> { id, label, total, endTime }
let finished = {}; // id -> true: scaduto, finché non viene resettato
const subs = new Set();

// Ripristino all'avvio: i timer scaduti mentre l'app era chiusa risultano "finiti".
try {
  const raw = JSON.parse(localStorage.getItem(KEY)) || {};
  const now = Date.now();
  for (const id in raw) {
    const t = raw[id];
    if (t && t.endTime > now) timers[id] = t;
    else if (t) finished[id] = true;
  }
} catch { /* nessun ripristino */ }

function save() {
  try { localStorage.setItem(KEY, JSON.stringify(timers)); } catch { /* */ }
}
function emit() { for (const fn of subs) fn(); }

export function subscribeTimers(fn) {
  subs.add(fn);
  return () => subs.delete(fn);
}
export function activeTimers() { return Object.values(timers); }
export function getTimer(id) { return timers[id] || null; }
export function isFinished(id) { return !!finished[id]; }

export function startTimer(id, label, seconds) {
  unlockAudio();
  try {
    if ("Notification" in window && Notification.permission === "default") Notification.requestPermission();
  } catch { /* */ }
  delete finished[id];
  timers[id] = { id, label, total: seconds, endTime: Date.now() + seconds * 1000 };
  save(); emit();
}

// Mette in pausa e restituisce i secondi rimanenti.
export function pauseTimer(id) {
  const t = timers[id];
  if (!t) return 0;
  const left = Math.max(0, Math.round((t.endTime - Date.now()) / 1000));
  delete timers[id];
  save(); emit();
  return left;
}

export function resetTimer(id) {
  stopAlarm(); // interagire con un timer mette a tacere l'allarme
  delete timers[id];
  delete finished[id];
  save(); emit();
}

// Controlla le scadenze (chiamato dal ticker globale dell'app e al ritorno
// in primo piano): suona/notifica e restituisce i timer appena scaduti.
export function checkTimers() {
  const now = Date.now();
  const expired = [];
  for (const id in timers) {
    if (timers[id].endTime - now <= 0) {
      expired.push(timers[id]);
      finished[id] = true;
      delete timers[id];
    }
  }
  if (expired.length) {
    save(); emit();
    startAlarm();
    notify(expired[0].label);
  }
  return expired;
}
