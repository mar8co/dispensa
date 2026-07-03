// Fix iOS standalone (PWA): quando l'app torna in primo piano, Safari può
// lasciare gli elementi `position: fixed` ancorati a un viewport "vecchio" e
// più corto — la barra di navigazione in basso finisce a metà schermo finché
// non avviene un reflow. Qui la riportiamo al suo posto al ritorno in
// foreground (e quando il viewport cambia dimensione).
//
// Strategia in due tempi, per NON disturbare il caso normale:
//  1. nudge di scroll: riallinea gli elementi fixed al viewport corrente senza
//     spostare davvero la pagina (invisibile, nessun lampeggio);
//  2. solo SE la navbar risulta ancora fuori posto (rilevato misurandola),
//     forza un reflow completo del body. Il reflow "duro" (con micro-lampeggio)
//     scatta quindi soltanto quando il bug è effettivamente presente.

// La navbar dovrebbe toccare (quasi) il fondo del viewport: se il suo bordo
// inferiore è ben sopra il fondo dello schermo, è ancorata a un viewport vecchio.
function isNavbarMisplaced() {
  const el = document.querySelector("[data-navbar]");
  if (!el) return false;
  const r = el.getBoundingClientRect();
  if (r.height === 0) return false;
  return window.innerHeight - r.bottom > 60;
}

// Nudge di scroll: forza iOS a riallineare gli elementi fixed al viewport
// corrente, ripristinando subito la posizione (nessuno spostamento visibile).
function scrollNudge() {
  const x = window.scrollX, y = window.scrollY;
  window.scrollTo(x, y + 1);
  window.scrollTo(x, y);
}

// Reflow completo garantito: rimonta l'albero di layout, ri-ancorando TUTTI gli
// elementi fixed. Gated dalla rilevazione, così il micro-lampeggio avviene solo
// quando la navbar è davvero fuori posto.
function hardReflow() {
  const b = document.body;
  const prev = b.style.display;
  b.style.display = "none";
  void b.offsetHeight; // forza il reflow
  b.style.display = prev;
}

function repair() {
  if (isNavbarMisplaced()) hardReflow();
}

// Al ritorno in primo piano: nudge subito + qualche controllo ritardato (il
// viewport iOS può assestarsi qualche centinaio di ms dopo il resume).
let raf = 0;
let busy = false;
function onResume() {
  if (busy) return; // coalescing del burst di eventi (pageshow+focus+visibility)
  busy = true;
  setTimeout(() => { busy = false; }, 500);
  scrollNudge();
  cancelAnimationFrame(raf);
  raf = requestAnimationFrame(() => { scrollNudge(); repair(); });
  setTimeout(() => { scrollNudge(); repair(); }, 250);
  setTimeout(repair, 550);
}

// Cambio dimensione viewport (barra URL di Safari, rotazione, tastiera): NON
// tocchiamo lo scroll (interferirebbe con lo scroll in corso), controlliamo solo
// se la navbar è finita fuori posto.
let resizeTimer = 0;
function onResize() {
  clearTimeout(resizeTimer);
  resizeTimer = setTimeout(repair, 120);
}

export function installViewportFix() {
  if (typeof window === "undefined") return;
  window.addEventListener("pageshow", onResume);
  window.addEventListener("focus", onResume);
  window.addEventListener("orientationchange", onResume);
  document.addEventListener("visibilitychange", () => {
    if (document.visibilityState === "visible") onResume();
  });
  window.addEventListener("resize", onResize);
}
