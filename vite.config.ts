import { sveltekit } from '@sveltejs/kit/vite';
import tailwindcss from '@tailwindcss/vite';
import { SvelteKitPWA } from '@vite-pwa/sveltekit';
import { defineConfig } from 'vite';
import { visualizer } from 'rollup-plugin-visualizer';

// `ANALYZE=1 npm run build` emits a bundle treemap (bundle-stats.html) so we can
// hold the line on the <200KB initial-JS budget (CLAUDE.md). Off by default.
const analyze = process.env.ANALYZE === '1';

export default defineConfig({
	plugins: [
		tailwindcss(),
		...(analyze
			? [
					visualizer({
						filename: 'bundle-stats.html',
						gzipSize: true,
						brotliSize: true,
						template: 'treemap'
					})
				]
			: []),
		SvelteKitPWA({
			strategies: 'injectManifest',
			srcDir: 'src',
			filename: 'service-worker.ts',
			registerType: 'autoUpdate',
			scope: '/',
			base: '/',
			injectManifest: {
				globPatterns: ['client/**/*.{js,css,ico,png,svg,webp,woff2}']
			},
			devOptions: {
				enabled: true,
				type: 'module'
			},
			kit: {
				includeVersionFile: true
			},
			manifest: {
				name: 'FOW — Future of Work',
				short_name: 'FOW',
				description: 'Bounty platform for Sierra Leone. Post paid work; compete to win.',
				theme_color: '#0f172a',
				background_color: '#fafafa',
				display: 'standalone',
				start_url: '/',
				scope: '/',
				icons: [
					{ src: '/icons/icon-192.png', sizes: '192x192', type: 'image/png' },
					{ src: '/icons/icon-512.png', sizes: '512x512', type: 'image/png' },
					{
						src: '/icons/icon-maskable-512.png',
						sizes: '512x512',
						type: 'image/png',
						purpose: 'maskable'
					}
				]
			}
		}),
		sveltekit()
	],
	server: {
		// Required so Vite accepts requests from admin.localhost during dev.
		host: true
	}
});
