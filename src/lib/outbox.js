// Coda di scritture in attesa per la Lista della spesa: se una scrittura
// fallisce (tipicamente perché sei offline), la mettiamo qui e la rigiochiamo
// al ritorno online. Persistita in localStorage, per-utente.
//
// v1: contiene solo UPDATE di articoli ESISTENTI (spunta, quantità, nome,
// reparto). Sono idempotenti per id, quindi il replay è sicuro e il Realtime
// riconcilia da solo. L'aggiunta/eliminazione offline di articoli nuovi
// richiede id generati lato client: sarà la v2.
const KEY = (uid) => `dispensa-outbox-${uid}`;

function load(uid) {
  try {
    const q = JSON.parse(localStorage.getItem(KEY(uid)));
    return Array.isArray(q) ? q : [];
  } catch {
    return [];
  }
}
function save(uid, q) {
  try { localStorage.setItem(KEY(uid), JSON.stringify(q)); } catch { /* niente coda */ }
}

// Accoda un'operazione (le diamo un _id così possiamo rimuoverla per id dopo il
// replay, anche se nel frattempo ne sono arrivate altre).
export function enqueue(uid, op) {
  const q = load(uid);
  q.push({ ...op, _id: Math.random().toString(36).slice(2) + Date.now().toString(36) });
  save(uid, q);
}

export function hasPending(uid) {
  return load(uid).length > 0;
}

// Rigioca le operazioni in ordine; al primo errore (ancora offline) si ferma e
// conserva le rimanenti. apply(op) esegue la scrittura reale. Rimuove ogni op
// riuscita per _id, così eventuali nuove operazioni accodate durante il flush
// non vanno perse.
export async function flush(uid, apply) {
  const snapshot = load(uid);
  for (const op of snapshot) {
    try {
      await apply(op);
      save(uid, load(uid).filter((x) => x._id !== op._id));
    } catch {
      return false;
    }
  }
  return true;
}
