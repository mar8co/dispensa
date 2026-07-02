// Replay delle operazioni offline (outbox v2): applica sul DB un'operazione
// rimasta in coda. Le op portano { table: "pantry"|"shopping", type:
// "insert"|"update"|"delete", id, row?, fields? }. Idempotenza del replay:
//  - una insert rigiocata dopo un successo "fantasma" (scrittura arrivata ma
//    risposta persa) urta la chiave primaria: il duplicato è un successo;
//  - update/delete puntano un id: su una riga assente sono no-op innocui.
// Le op v1 ancora in coda ({ type:"update", id, fields } senza table) restano
// valide: il default è "shopping" (l'unico tipo che la v1 accodava).
import {
  insertItem, updateItem, deleteItem,
  insertShopping, updateShopping, deleteShopping,
} from "./db.js";

// Id generato lato client per le righe ottimistiche: è l'id DEFINITIVO della
// riga anche sul DB (colonna uuid), quindi lo stato locale non va riconciliato
// dopo l'insert. Fallback v4 manuale per i (rari) contesti senza randomUUID.
export function newLocalId() {
  if (typeof crypto !== "undefined" && crypto.randomUUID) return crypto.randomUUID();
  const b = crypto.getRandomValues(new Uint8Array(16));
  b[6] = (b[6] & 0x0f) | 0x40; // versione 4
  b[8] = (b[8] & 0x3f) | 0x80; // variante RFC 4122
  const h = [...b].map((x) => x.toString(16).padStart(2, "0")).join("");
  return `${h.slice(0, 8)}-${h.slice(8, 12)}-${h.slice(12, 16)}-${h.slice(16, 20)}-${h.slice(20)}`;
}

const isDuplicate = (e) =>
  e?.code === "23505" || /duplicate key/i.test(String(e?.message || ""));

export async function applyOp(op) {
  const table = op.table || "shopping";
  try {
    if (table === "pantry") {
      if (op.type === "insert") await insertItem(op.row);
      else if (op.type === "delete") await deleteItem(op.id);
      else await updateItem(op.id, op.fields);
    } else {
      if (op.type === "insert") await insertShopping(op.row);
      else if (op.type === "delete") await deleteShopping(op.id);
      else await updateShopping(op.id, op.fields);
    }
  } catch (e) {
    if (op.type === "insert" && isDuplicate(e)) return; // già sul DB: ok
    throw e;
  }
}
