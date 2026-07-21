// Serverless function Vercel: App Store Server Notifications V2 (Apple → noi).
// La logica vera è in ../server/receipt.js (condivisa col dev locale). Questo
// URL va incollato in App Store Connect (Production e Sandbox). Apple invia un
// POST con { signedPayload }; noi rispondiamo 200 quando l'abbiamo gestita (o
// consapevolmente ignorata), così Apple non riprova all'infinito.
// Env richieste: come api/receipt.js.
import { handleAppStoreNotification } from "../server/receipt.js";

export default async function handler(req, res) {
  if (req.method !== "POST") {
    res.status(405).json({ error: "Metodo non consentito." });
    return;
  }

  const out = await handleAppStoreNotification({
    body: req.body, // Vercel fa già il parse del JSON body
    env: process.env,
  });

  res.status(out.status).json(out.json);
}
