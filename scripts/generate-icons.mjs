// Genera i PNG dell'icona (PWA + app iOS) da public/icon.svg.
// Uso: node scripts/generate-icons.mjs
import sharp from "sharp";
import { readFileSync, existsSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";

const root = join(dirname(fileURLToPath(import.meta.url)), "..");
const svg = readFileSync(join(root, "public", "icon.svg"));
const pub = join(root, "public");
// Beige del marchio (#dcceb3): fondo dell'icona (uguale a public/icon.svg).
const FONDO = { r: 220, g: 206, b: 179, alpha: 1 };

const targets = [
  { file: "pwa-192x192.png", size: 192 },
  { file: "pwa-512x512.png", size: 512 },
  { file: "apple-touch-icon.png", size: 180 },
  { file: "favicon-32x32.png", size: 32 },
];

for (const t of targets) {
  await sharp(svg, { density: 300 })
    .resize(t.size, t.size)
    .png()
    .toFile(join(pub, t.file));
  console.log("✓", t.file, `(${t.size}px)`);
}

// Maskable (Android): il launcher ritaglia un cerchio/forma nell'80% centrale,
// quindi il logo va rimpicciolito su un fondo beige pieno.
const inner = await sharp(svg, { density: 300 }).resize(410, 410).png().toBuffer();
await sharp({ create: { width: 512, height: 512, channels: 4, background: FONDO } })
  .composite([{ input: inner, left: 51, top: 51 }])
  .png()
  .toFile(join(pub, "maskable-512x512.png"));
console.log("✓ maskable-512x512.png (512px, zona sicura)");

// Icona dell'app nativa iOS (Capacitor): 1024×1024 SENZA trasparenza (App
// Store la rifiuta con il canale alfa).
const iosIcon = join(root, "ios", "App", "App", "Assets.xcassets", "AppIcon.appiconset", "AppIcon-512@2x.png");
if (existsSync(dirname(iosIcon))) {
  await sharp(svg, { density: 600 })
    .resize(1024, 1024)
    .flatten({ background: FONDO })
    .removeAlpha()
    .png()
    .toFile(iosIcon);
  console.log("✓ AppIcon-512@2x.png (1024px, iOS)");
}
console.log("Icone generate");
