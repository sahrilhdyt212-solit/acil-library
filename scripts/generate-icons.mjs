import sharp from "sharp";
import { mkdirSync, readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

// Generates PWA + iOS icons from the brand mark (app/icon.svg).
// Runs on postinstall (incl. Vercel builds). Outputs are git-ignored.
const root = join(dirname(fileURLToPath(import.meta.url)), "..");
const iconsDir = join(root, "public", "icons");
mkdirSync(iconsDir, { recursive: true });

const full = readFileSync(join(root, "app", "icon.svg"));

// Glyph-only artwork (no background) for the maskable icon:
// full-bleed bg with the mark at ~70% so masking never clips it.
const glyph = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 64 64">
  <g fill="none" stroke="#ffffff" stroke-width="3.4" stroke-linecap="round" stroke-linejoin="round" transform="translate(7,7) scale(0.78)">
    <path d="M32 18C26 13.5 19 13 12 15.5V48c7-2.5 14-2 20 2.5"/>
    <path d="M32 18c6-4.5 13-5 20-2.5V48c-7-2.5-14-2-20 2.5"/>
    <path d="M32 18v32.5"/>
  </g>
</svg>`;
const maskableBg = {
  create: {
    width: 512,
    height: 512,
    channels: 4,
    background: "#1d1d1f",
  },
};

await sharp(full, { density: 256 }).resize(192, 192).png().toFile(join(iconsDir, "icon-192.png"));
await sharp(full, { density: 512 }).resize(512, 512).png().toFile(join(iconsDir, "icon-512.png"));
await sharp({
  ...maskableBg,
})
  .composite([{ input: Buffer.from(glyph), gravity: "center" }])
  .png()
  .toFile(join(iconsDir, "maskable-512.png"));
await sharp(full, { density: 256 })
  .resize(180, 180)
  .png()
  .toFile(join(root, "app", "apple-icon.png"));

console.log("[acil] PWA icons generated (192, 512, maskable, apple-touch).");
