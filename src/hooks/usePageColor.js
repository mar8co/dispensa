// Colore pieno della schermata (fondo + barra di stato): applicato prima del
// paint, così non si vede mai un fotogramma col colore della pagina precedente.
// `null` = non toccare (lo gestisce un altro componente).
import { useLayoutEffect } from "react";
import { setPageColor } from "../lib/colors.js";

export function usePageColor(hex) {
  useLayoutEffect(() => {
    if (hex) setPageColor(hex);
  }, [hex]);
}
