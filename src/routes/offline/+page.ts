// Prerendered at build time so the service worker can precache a fully static
// offline shell (see src/service-worker.ts `setCatchHandler`). It also gives the
// PWA plugin's hardcoded `prerendered/**` precache glob a file to match, which
// would otherwise warn on every build.
export const prerender = true;
