/*
 * Placeholder PWA icon generator.
 *
 * Renders a minimal "FOW" monogram into three PNGs at the sizes required by
 * `static/manifest.webmanifest`. Run once after pulling the repo or whenever
 * the source design lands; outputs are committed so production builds never
 * depend on `sharp` (a heavy native binary that stays in devDependencies).
 *
 *   npm run gen:icons
 */
import { mkdir, writeFile } from 'node:fs/promises';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import sharp from 'sharp';

const THEME_BG = '#0f172a';
const FG = '#fafafa';

// Self-contained monogram so this script doesn't depend on the existing
// favicon.svg (which is the upstream Svelte logo — visual placeholder only).
function monogramSvg(size: number, opts: { padding?: number } = {}): Buffer {
	const padding = opts.padding ?? 0;
	const inner = size - padding * 2;
	const fontSize = Math.round(inner * 0.48);
	const cy = Math.round(size / 2 + fontSize * 0.18); // visual centring offset
	return Buffer.from(`<?xml version="1.0" encoding="UTF-8"?>
<svg xmlns="http://www.w3.org/2000/svg" width="${size}" height="${size}" viewBox="0 0 ${size} ${size}">
  <rect width="${size}" height="${size}" rx="${Math.round(size * 0.18)}" fill="${THEME_BG}"/>
  <text x="50%" y="${cy}" text-anchor="middle" font-family="-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,Helvetica,Arial,sans-serif" font-weight="800" font-size="${fontSize}" fill="${FG}" letter-spacing="-2">FOW</text>
</svg>`);
}

async function renderToFile(size: number, file: string, opts: { maskable?: boolean } = {}) {
	if (opts.maskable) {
		// Maskable icons need a ~10% safe zone on each side; render the monogram
		// onto a 410x410 region centred inside a 512x512 theme-color background.
		const innerSize = Math.round(size * 0.8);
		const innerSvg = monogramSvg(innerSize);
		const inner = await sharp(innerSvg).png().toBuffer();
		await sharp({
			create: {
				width: size,
				height: size,
				channels: 4,
				background: THEME_BG
			}
		})
			.composite([{ input: inner, gravity: 'center' }])
			.png({ compressionLevel: 9 })
			.toFile(file);
	} else {
		await sharp(monogramSvg(size)).png({ compressionLevel: 9 }).toFile(file);
	}
	console.log(`  wrote ${file}`);
}

async function main() {
	const here = dirname(fileURLToPath(import.meta.url));
	const outDir = resolve(here, '..', 'static', 'icons');
	await mkdir(outDir, { recursive: true });

	await renderToFile(192, resolve(outDir, 'icon-192.png'));
	await renderToFile(512, resolve(outDir, 'icon-512.png'));
	await renderToFile(512, resolve(outDir, 'icon-maskable-512.png'), { maskable: true });

	// Also write a 32x32 favicon.png for the document <link>.
	const favSvg = monogramSvg(64);
	const fav = await sharp(favSvg).resize(32, 32).png().toBuffer();
	await writeFile(resolve(outDir, 'favicon-32.png'), fav);
	console.log(`  wrote ${resolve(outDir, 'favicon-32.png')}`);
}

main().catch((e) => {
	console.error(e);
	process.exit(1);
});
