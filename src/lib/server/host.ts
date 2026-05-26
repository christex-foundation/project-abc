/**
 * Host-based routing helpers (plan §5).
 *
 *   Production: fow.sl + admin.fow.sl
 *   Local dev : localhost:5173 + admin.localhost:5173
 */

export function isAdminHost(url: URL): boolean {
	const host = url.hostname;
	return host === 'admin.localhost' || host.startsWith('admin.');
}

/**
 * Strips the `admin.` prefix from a URL's host, preserving port. Used to
 * redirect admin-host visitors away from non-admin paths.
 */
export function mainHostFor(url: URL): string {
	const host = url.hostname.replace(/^admin\./, '');
	return url.port ? `${host}:${url.port}` : host;
}

/**
 * The opposite of `mainHostFor` — used to bounce main-host visitors of
 * /admin* over to the admin host.
 */
export function adminHostFor(url: URL): string {
	const host = url.hostname.startsWith('admin.') ? url.hostname : `admin.${url.hostname}`;
	return url.port ? `${host}:${url.port}` : host;
}

/**
 * Whitelist of pathnames the admin host may serve. Anything outside this list
 * 404s on admin.* to keep that host single-purpose (plan §5 hook step 2).
 */
const ADMIN_HOST_PATH_ALLOWLIST = [
	/^\/admin(\/|$)/,
	/^\/api\//,
	/^\/login$/,
	/^\/forgot-password$/,
	/^\/accept-invite$/,
	/^\/verify-email$/,
	/^\/robots\.txt$/,
	/^\/_app\//,
	/^\/favicon\./
];

export function isAdminHostAllowedPath(pathname: string): boolean {
	return ADMIN_HOST_PATH_ALLOWLIST.some((re) => re.test(pathname));
}
