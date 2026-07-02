// Gate di autenticazione: mostra lo spinner mentre verifica la sessione,
// la schermata di login se non autenticato, altrimenti l'app vera e propria.
import { Loader2 } from "lucide-react";
import { useAuth } from "./hooks/useAuth.js";
import Auth from "./components/Auth.jsx";
import Dispensa from "./Dispensa.jsx";
import { Analytics } from "@vercel/analytics/react";

export default function App() {
  const { session, authLoading } = useAuth();

  if (authLoading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-cream">
        <Loader2 className="h-6 w-6 animate-spin text-stone-400" />
      </div>
    );
  }

  if (!session) return <Auth />;

  // key={user.id} -> rimonta l'app pulita a ogni cambio utente.
  return (
    <>
      <Dispensa key={session.user.id} session={session} />
      <Analytics />
    </>
  );
}
