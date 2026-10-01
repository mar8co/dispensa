// Genera le splash screen iOS (apple-touch-startup-image) da public/icon.svg.
// Uso: node scripts/generate-splash.mjs
//
// Veste manifesto: fondo beige del marchio, il logo (l'icona: il suo
// quadrato beige sparisce sul fondo uguale) e la scritta "Dispensa" in Inter
// Tight 800. La scritta è un'immagine già pronta (scripts/assets/
// wordmark-dispensa.png, disegnata una volta con il carattere dell'app): così
// qui non serve alcun file del carattere. La sottolineatura ondulata NON è
// nell'immagine statica: la disegna l'intro in-app (SplashIntro.jsx), così la
// splash nativa è esattamente il primo fotogramma dell'animazione.
//
// Perché su iOS serve un'immagine per risoluzione fisica di device (la PWA non
// deriva la splash dal manifest): copriamo i principali iPhone in PORTRAIT.
// Un solo tema (chiaro): niente più varianti scure.
import sharp from "sharp";
import { readFileSync, writeFileSync, mkdirSync, existsSync, readdirSync, unlinkSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";

const root = join(dirname(fileURLToPath(import.meta.url)), "..");
const svg = readFileSync(join(root, "public", "icon.svg"));
const wordmark = readFileSync(join(root, "scripts", "assets", "wordmark-dispensa.png"));
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

// Beige del marchio #dcceb3 (= PAGE_COLOR.accesso in src/lib/colors.js e theme-color).
const BG = { r: 220, g: 206, b: 179, alpha: 1 };

// Lockup centrato: barattoli sopra, scritta sotto. `visibleW` = larghezza utile.
async function lockup(width, height, visibleW, minSide) {
  const iconSize = Math.round(minSide * 0.3);
  const iconPng = await sharp(svg, { density: 300 }).resize(iconSize, iconSize).png().toBuffer();
  const wordW = Math.round(visibleW * 0.46);
  const wImg = await sharp(wordmark).resize({ width: wordW }).png().toBuffer();
  const wordH = (await sharp(wImg).metadata()).height;
  const gap = Math.round(minSide * 0.03);
  const blockH = iconSize + gap + wordH;
  const top = Math.round(height * 0.46 - blockH / 2);
  return sharp({ create: { width, height, channels: 4, background: BG } })
    .composite([
      { input: iconPng, left: Math.round(width / 2 - iconSize / 2), top },
      { input: wImg, left: Math.round(width / 2 - wordW / 2), top: top + iconSize + gap },
    ])
    .png({ compressionLevel: 9 });
}

// Via le splash scure della veste precedente (non più collegate in index.html).
for (const f of readdirSync(outDir)) {
  if (f.startsWith("apple-splash-dark-")) unlinkSync(join(outDir, f));
}

for (const d of DEVICES) {
  const pw = d.w * d.dpr;
  const ph = d.h * d.dpr;
  const file = `apple-splash-light-${pw}-${ph}.png`;
  await (await lockup(pw, ph, pw, Math.min(pw, ph))).toFile(join(outDir, file));
  console.log("✓", file, `— ${d.note}`);
}
console.log(`\n${DEVICES.length} immagini in /public/splash`);

// ============================================================
//  Splash NATIVA iOS (Capacitor) — stesso lockup, asset diverso
// ============================================================
// La LaunchScreen.storyboard mostra un'unica immagine QUADRATA 2732×2732 in
// `scaleAspectFill`. Su un iPhone in verticale il quadrato viene scalato per
// coprire lo schermo: si vede tutta l'altezza ma solo la striscia centrale in
// larghezza (~46% sui modelli più allungati). Quindi il lockup va dimensionato
// su quella striscia, non sul lato del quadrato, altrimenti risulterebbe
// enorme e tagliato ai bordi.
const NATIVE_SIZE = 2732;
const VISIBLE_W = Math.round(NATIVE_SIZE * 0.46); // striscia visibile in portrait
const nativeDir = join(root, "ios", "App", "App", "Assets.xcassets", "Splash.imageset");

if (existsSync(nativeDir)) {
  const png = await (await lockup(NATIVE_SIZE, NATIVE_SIZE, VISIBLE_W, VISIBLE_W)).toBuffer();
  // Xcode chiede 1x/2x/3x: Capacitor usa lo stesso asset per tutti e tre.
  for (const n of ["", "-1", "-2"]) {
    writeFileSync(join(nativeDir, `splash-2732x2732${n}.png`), png);
    const dark = join(nativeDir, `splash-2732x2732-dark${n}.png`);
    if (existsSync(dark)) unlinkSync(dark); // un solo tema
  }
  writeFileSync(join(nativeDir, "Contents.json"), JSON.stringify({
    images: [
      { idiom: "universal", filename: "splash-2732x2732-2.png", scale: "1x" },
      { idiom: "universal", filename: "splash-2732x2732-1.png", scale: "2x" },
      { idiom: "universal", filename: "splash-2732x2732.png", scale: "3x" },
    ],
    info: { version: 1, author: "xcode" },
  }, null, 2) + "\n");
  console.log("✓ splash nativa iOS + Contents.json (un solo tema)");
}
