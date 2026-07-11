// Genera le splash screen iOS (apple-touch-startup-image) da public/icon.svg.
// Uso: node scripts/generate-splash.mjs
//
// Perché: su iOS la PWA NON deriva la splash dal manifest (a differenza di
// Android/Chrome). Serve un <link rel="apple-touch-startup-image"> per ogni
// risoluzione FISICA di device, con la media query che combina device-width/
// height in px CSS + device-pixel-ratio + orientamento. Qui copriamo i
// principali iPhone in PORTRAIT (la PWA è portrait-only), in variante chiara
// e scura (prefers-color-scheme), con l'icona centrata sul colore di brand.
//
// Lo script stampa anche i tag <link> corrispondenti (in scripts/_splash-
// links.html) così l'index.html resta allineato a ciò che viene generato.
import sharp from "sharp";
import { readFileSync, writeFileSync, mkdirSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";

const root = join(dirname(fileURLToPath(import.meta.url)), "..");
const svg = readFileSync(join(root, "public", "icon.svg"));
const outDir = join(root, "public", "splash");
mkdirSync(outDir, { recursive: true });

// iPhone, PORTRAIT. w/h in px CSS (punti); i pixel fisici = w*dpr, h*dpr.
// Device con stessa risoluzione CSS ma dpr diverso restano distinti dalla
// media query (-webkit-device-pixel-ratio).
const DEVICES = [
  { w: 375, h: 667, dpr: 2, note: "iPhone SE 2/3, 8, 7, 6s" },
  { w: 414, h: 896, dpr: 2, note: "iPhone XR, 11" },
  { w: 375, h: 812, dpr: 3, note: "iPhone X/XS/11 Pro, 12/13 mini" },
  { w: 390, h: 844, dpr: 3, note: "iPhone 12/13/14, 12/13 Pro" },
  { w: 393, h: 852, dpr: 3, note: "iPhone 14 Pro, 15/15 Pro, 16" },
  { w: 402, h: 874, dpr: 3, note: "iPhone 16 Pro" },
  { w: 414, h: 736, dpr: 3, note: "iPhone 6/7/8 Plus" },
  { w: 414, h: 896, dpr: 3, note: "iPhone XS Max, 11 Pro Max" },
  { w: 428, h: 926, dpr: 3, note: "iPhone 12/13 Pro Max, 14 Plus" },
  { w: 430, h: 932, dpr: 3, note: "iPhone 14/15/16 Pro Max, 15/16 Plus" },
  { w: 440, h: 956, dpr: 3, note: "iPhone 16 Pro Max" },
];

// Palette di brand (allineata a theme-color in index.html e ai token CSS).
const THEMES = [
  { name: "light", scheme: "light", bg: { r: 244, g: 241, b: 233, alpha: 1 } }, // #f4f1e9
  { name: "dark", scheme: "dark", bg: { r: 18, g: 18, b: 17, alpha: 1 } }, //  #121211
];

const links = [];

for (const d of DEVICES) {
  const pw = d.w * d.dpr;
  const ph = d.h * d.dpr;
  // Icona centrata a ~40% del lato corto: prominente ma non invadente.
  const iconSize = Math.round(Math.min(pw, ph) * 0.4);
  // density 96 come generate-icons.mjs: l'SVG (viewBox 4267) viene rasterizzato
  // grande e poi ridotto a iconSize → nitido, senza sforare il pixel limit.
  const iconPng = await sharp(svg, { density: 96 }).resize(iconSize, iconSize).png().toBuffer();

  for (const t of THEMES) {
    const file = `apple-splash-${t.name}-${pw}-${ph}.png`;
    await sharp({ create: { width: pw, height: ph, channels: 4, background: t.bg } })
      .composite([{ input: iconPng, gravity: "center" }])
      .png({ compressionLevel: 9 })
      .toFile(join(outDir, file));
    console.log("✓", file, `— ${d.note}`);

    const media =
      `(prefers-color-scheme: ${t.scheme}) and (device-width: ${d.w}px) and ` +
      `(device-height: ${d.h}px) and (-webkit-device-pixel-ratio: ${d.dpr}) and ` +
      `(orientation: portrait)`;
    links.push(
      `    <link rel="apple-touch-startup-image" media="${media}" href="/splash/${file}" />`
    );
  }
}

writeFileSync(join(root, "scripts", "_splash-links.html"), links.join("\n") + "\n");
console.log(`\n${DEVICES.length} device × ${THEMES.length} temi = ${links.length} immagini.`);
console.log("Tag <link> scritti in scripts/_splash-links.html");
