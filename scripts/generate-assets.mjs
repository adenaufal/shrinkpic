/**
 * Rasterizes the brand artwork (public/favicon.svg) into every PNG the site
 * ships: favicons, PWA icons and the social-share OG image.
 *
 * Run via `npm run assets` whenever the logo changes — the PNGs are committed,
 * so this only needs to run by hand, not on every build.
 *
 * The icon artwork below is copied from public/favicon.svg (the canonical
 * source). Keep the two in sync when the logo changes.
 */
import { mkdir, readFile } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import sharp from 'sharp';

const PUBLIC = fileURLToPath(new URL('../public/', import.meta.url));

// Brand palette — must match favicon.svg and the PWA manifest theme colour.
const GRAD_FROM = '#3B82F6';
const GRAD_TO = '#8B5CF6';
const DARK_BG = '#0f172a';
const MUTED = '#94a3b8';
const FAINT = '#64748b';

/**
 * Maskable icons get cropped to a circle/square by launchers, so the important
 * content must sit inside the central ~80% safe zone: the logo tile is scaled
 * to 72% and centred on a full-bleed gradient.
 */
const maskable = (size) => `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 64 64" width="${size}" height="${size}">
  <defs>
    <linearGradient id="g" x1="0" y1="0" x2="64" y2="64" gradientUnits="userSpaceOnUse">
      <stop offset="0" stop-color="${GRAD_FROM}" />
      <stop offset="1" stop-color="${GRAD_TO}" />
    </linearGradient>
  </defs>
  <rect width="64" height="64" fill="url(#g)" />
  <g transform="translate(8.96 8.96) scale(0.72)">
    <path d="M23 5h18L32 17z" fill="#fff" />
    <path d="M23 59h18L32 47z" fill="#fff" />
    <rect x="9" y="21" width="46" height="22" rx="5" fill="#fff" />
    <circle cx="19" cy="28.5" r="3.2" fill="${GRAD_FROM}" />
    <path d="M13 40.5 22.5 31l5.5 5.5L36 28.5l13 12z" fill="${GRAD_TO}" />
  </g>
</svg>`;

/** 1200×630 social-share card: dark backdrop, logo, wordmark, tagline, URL. */
const ogImage = () => `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 1200 630" width="1200" height="630">
  <defs>
    <linearGradient id="g" x1="0" y1="0" x2="64" y2="64" gradientUnits="userSpaceOnUse">
      <stop offset="0" stop-color="${GRAD_FROM}" />
      <stop offset="1" stop-color="${GRAD_TO}" />
    </linearGradient>
    <radialGradient id="glow-b" cx="0.5" cy="0.5" r="0.5">
      <stop offset="0" stop-color="${GRAD_FROM}" stop-opacity="0.28" />
      <stop offset="1" stop-color="${GRAD_FROM}" stop-opacity="0" />
    </radialGradient>
    <radialGradient id="glow-p" cx="0.5" cy="0.5" r="0.5">
      <stop offset="0" stop-color="${GRAD_TO}" stop-opacity="0.26" />
      <stop offset="1" stop-color="${GRAD_TO}" stop-opacity="0" />
    </radialGradient>
  </defs>

  <rect width="1200" height="630" fill="${DARK_BG}" />
  <circle cx="140" cy="70" r="360" fill="url(#glow-b)" />
  <circle cx="1080" cy="580" r="380" fill="url(#glow-p)" />

  <g transform="translate(505 62)">
    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 64 64" width="190" height="190">
      <rect width="64" height="64" rx="14" fill="url(#g)" />
      <path d="M23 5h18L32 17z" fill="#fff" />
      <path d="M23 59h18L32 47z" fill="#fff" />
      <rect x="9" y="21" width="46" height="22" rx="5" fill="#fff" />
      <circle cx="19" cy="28.5" r="3.2" fill="${GRAD_FROM}" />
      <path d="M13 40.5 22.5 31l5.5 5.5L36 28.5l13 12z" fill="${GRAD_TO}" />
    </svg>
  </g>

  <text x="600" y="378" text-anchor="middle" fill="#ffffff"
        font-family="'Segoe UI', Arial, 'DejaVu Sans', sans-serif" font-weight="700"
        font-size="104" letter-spacing="-2">Shrinkpic</text>

  <text x="600" y="452" text-anchor="middle" fill="${MUTED}"
        font-family="'Segoe UI', Arial, 'DejaVu Sans', sans-serif" font-weight="400"
        font-size="34">Free private image compressor — nothing ever leaves your device</text>

  <text x="600" y="556" text-anchor="middle" fill="${FAINT}"
        font-family="'Segoe UI', Arial, 'DejaVu Sans', sans-serif" font-weight="600"
        font-size="26">shrinkpic.adenaufal.com</text>
</svg>`;

const out = (name) => path.join(PUBLIC, name);

const png = async (svg, size, file) =>
  sharp(Buffer.from(svg), { density: (72 * size) / 64 })
    .resize(size, size)
    .png()
    .toFile(out(file));

await mkdir(PUBLIC, { recursive: true });

// Direct rasterizations of the canonical favicon.svg.
const favicon = await readFile(out('favicon.svg'));
await sharp(favicon, { density: 72 * 32 / 64 }).resize(32, 32).png().toFile(out('favicon-32.png'));
await sharp(favicon, { density: 72 * 192 / 64 }).resize(192, 192).png().toFile(out('favicon-192.png'));
await sharp(favicon, { density: 72 * 192 / 64 }).resize(192, 192).png().toFile(out('icon-192.png'));
await sharp(favicon, { density: 72 * 512 / 64 }).resize(512, 512).png().toFile(out('icon-512.png'));
await sharp(favicon, { density: 72 * 180 / 64 }).resize(180, 180).png().toFile(out('apple-touch-icon.png'));

await png(maskable(512), 512, 'icon-512-maskable.png');
await sharp(Buffer.from(ogImage())).png().toFile(out('og-image.png'));

console.log('Generated favicons, PWA icons and og-image.png in public/');
