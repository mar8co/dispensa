// Stato della connessione: espone un booleano `online` aggiornato dagli
// eventi "online"/"offline" del browser (usato per l'indicatore offline).
// SSR-safe: senza `navigator` assume online e non registra i listener.
import { useState, useEffect } from "react";

export function useOnline() {
  const [online, setOnline] = useState(
    typeof navigator !== "undefined" ? navigator.onLine : true
  );

  useEffect(() => {
    if (typeof window === "undefined") return;
    const goOnline = () => setOnline(true);
    const goOffline = () => setOnline(false);
    window.addEventListener("online", goOnline);
    window.addEventListener("offline", goOffline);
    return () => {
      window.removeEventListener("online", goOnline);
      window.removeEventListener("offline", goOffline);
    };
  }, []);

  return online;
}
