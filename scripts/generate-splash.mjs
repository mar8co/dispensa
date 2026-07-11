// Genera le splash screen iOS (apple-touch-startup-image) da public/icon.svg.
// Uso: node scripts/generate-splash.mjs
//
// Layout "concept 4": icona + wordmark "Dispensa" (font Hanken Grotesk
// ExtraBold, lo stesso dell'app, bundlato in scripts/assets). La sottolineatura
// ondulata NON è nell'immagine statica: la disegna l'intro in-app
// (src/components/SplashIntro.jsx), così la splash nativa iOS è esattamente il
// primo fotogramma dell'animazione e il passaggio è senza stacco.
//
// Perché su iOS serve un'immagine per risoluzione fisica di device (la PWA non
// deriva la splash dal manifest): copriamo i principali iPhone in PORTRAIT,
// variante chiara (#f4f1e9) e scura (#121211) via prefers-color-scheme.
// I nomi file restano invariati: i <link> in index.html non cambiano.
import sharp from "sharp";
import { readFileSync, mkdirSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";

const root = join(dirname(fileURLToPath(import.meta.url)), "..");
const svg = readFileSync(join(root, "public", "icon.svg"));
const fontfile = join(root, "scripts", "assets", "HankenGrotesk-ExtraBold.ttf");
const outDir = join(root, "public", "splash");
mkdirSync(outDir, { recursive: true });

// iPhone, PORTRAIT. w/h in px CSS (punti); pixel fisici = w*dpr, h*dpr.
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

// Palette di brand (allineata a --cream in index.css e a theme-color).
const THEMES = [
  { name: "light", bg: { r: 244, g: 241, b: 233, alpha: 1 }, ink: "#0a0a0a" },
  { name: "dark", bg: { r: 18, g: 18, b: 17, alpha: 1 }, ink: "#f4f1e9" },
];

// Wordmark ad alta risoluzione per tema (poi ridimensionato per device).
async function renderWord(color) {
  return await sharp({
    text: {
      text: `<span foreground="${color}" letter_spacing="-1600">Dispensa</span>`,
      font: "Hanken Grotesk 96",
      fontfile,
      rgba: true,
      dpi: 300,
    },
  }).png().toBuffer();
}
const wordBuf = {};
for (const t of THEMES) wordBuf[t.name] = await renderWord(t.ink);

for (const d of DEVICES) {
  const pw = d.w * d.dpr;
  const ph = d.h * d.dpr;
  const minSide = Math.min(pw, ph);
  const iconSize = Math.round(minSide * 0.3);
  const iconPng = await sharp(svg, { density: 96 }).resize(iconSize, iconSize).png().toBuffer();
  const wordW = Math.round(pw * 0.42);
  const gap = Math.round(minSide * 0.05);

  for (const t of THEMES) {
    const wImg = await sharp(wordBuf[t.name]).resize({ width: wordW }).png().toBuffer();
    const wordH = (await sharp(wImg).metadata()).height;
    const blockH = iconSize + gap + wordH;
    const top = Math.round(ph * 0.46 - blockH / 2);
    const file = `apple-splash-${t.name}-${pw}-${ph}.png`;
    await sharp({ create: { width: pw, height: ph, channels: 4, background: t.bg } })
      .composite([
        { input: iconPng, left: Math.round(pw / 2 - iconSize / 2), top },
        { input: wImg, left: Math.round(pw / 2 - wordW / 2), top: top + iconSize + gap },
      ])
      .png({ compressionLevel: 9 })
      .toFile(join(outDir, file));
    console.log("✓", file, `— ${d.note}`);
  }
}
console.log(`\n${DEVICES.length} device × ${THEMES.length} temi = ${DEVICES.length * THEMES.length} immagini in /public/splash`);
