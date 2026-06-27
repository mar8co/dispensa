// Helper immagine per l'OCR scontrino: ridimensiona una foto (File dalla
// fotocamera nativa o dalla galleria) prima di mandarla all'AI.
//
// Perché: la fotocamera nativa dell'iPhone scatta a ~12 MP (lato lungo ~4000 px).
// Per leggere il testo di uno scontrino bastano ~2000 px sul lato lungo; oltre,
// si spreca soltanto. Ridimensionando qui il payload base64 verso /api/claude
// cala di ~5×: meno costo AI, meno latenza, nessun rischio di sforare i limiti.
// La piena risoluzione del sensore serve in cattura (autofocus, dettaglio), non
// in trasmissione: catturiamo alto e inviamo "il giusto".

function loadImage(src) {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.onload = () => resolve(img);
    img.onerror = () => reject(new Error("Immagine non caricabile"));
    img.src = src;
  });
}

// File immagine -> { base64, mediaType }, ridimensionato con il lato lungo a
// maxSide px (se più piccolo, resta invariato) e codificato JPEG.
export async function fileToResizedBase64(file, maxSide = 2000, quality = 0.85) {
  const url = URL.createObjectURL(file);
  try {
    const img = await loadImage(url);
    const longest = Math.max(img.width, img.height) || 1;
    const scale = Math.min(1, maxSide / longest);
    const w = Math.max(1, Math.round(img.width * scale));
    const h = Math.max(1, Math.round(img.height * scale));
    const canvas = document.createElement("canvas");
    canvas.width = w;
    canvas.height = h;
    const ctx = canvas.getContext("2d");
    ctx.drawImage(img, 0, 0, w, h);
    const data64 = canvas.toDataURL("image/jpeg", quality).split(",")[1];
    return { base64: data64, mediaType: "image/jpeg" };
  } finally {
    URL.revokeObjectURL(url);
  }
}
