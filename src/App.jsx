// Gate di autenticazione: mostra lo spinner mentre verifica la sessione,
// la schermata di login se non autenticato, altrimenti l'app vera e propria.
import { Loader2 } from "lucide-react";
import { useAuth } from "./hooks/useAuth.js";
import Auth from "./components/Auth.jsx";
import Dispensa from "./Dispensa.jsx";
import SplashIntro from "./components/SplashIntro.jsx";
import { usePageColor } from "./hooks/usePageColor.js";
import { PAGE_COLOR } from "./lib/colors.js";

export default function App() {
  const { session, authLoading } = useAuth();
  // Caricamento e accesso hanno il beige del marchio; dentro l'app il colore
  // lo decide la scheda aperta (Dispensa.jsx).
  usePageColor(authLoading || !session ? PAGE_COLOR.accesso : null);

  // L'intro splash copre l'avvio (spinner/login/app) e si dissolve da sola.
  // Sta sopra ogni ramo, così si vede a ogni apertura a freddo dell'app.
  let content;
  if (authLoading) {
    content = (
      <div className="flex min-h-screen items-center justify-center bg-sfondo">
        <Loader2 className="h-6 w-6 animate-spin text-ink/40" />
      </div>
    );
  } else if (!session) {
    content = <Auth />;
  } else {
    // key={user.id} -> rimonta l'app pulita a ogni cambio utente.
    content = <Dispensa key={session.user.id} session={session} />;
  }

  return (
    <>
      <SplashIntro />
      {content}
    </>
  );
}
