import { toast } from 'svelte-sonner';

/**
 * Thrown when a request never reaches the server — the device is offline, the
 * request timed out, or the connection dropped. Distinct from an HTTP error
 * response (which callers inspect via `res.ok` themselves).
 */
export class NetworkError extends Error {
	constructor(
		message: string,
		readonly kind: 'offline' | 'timeout' | 'failed',
		options?: ErrorOptions
	) {
		super(message, options);
		this.name = 'NetworkError';
	}
}

export type ApiFetchOptions = {
	/** Abort (and treat as a failure) after this many ms. Default 12000. */
	timeoutMs?: number;
	/** Show a Sonner toast when the request can't reach the server. Default true. */
	toastOnError?: boolean;
	/** When provided, the error toast offers a "Retry" action that calls this. */
	retry?: () => void;
};

/**
 * `fetch` hardened for flaky / low-bandwidth mobile networks: it short-circuits
 * when the device is offline, applies a timeout, and surfaces a clear toast on
 * network failure (instead of a silent dead request) — optionally with a Retry
 * action. It does NOT toast on HTTP error statuses; callers still check
 * `res.ok` for application-level errors.
 */
export async function apiFetch(
	input: RequestInfo | URL,
	init?: RequestInit,
	opts: ApiFetchOptions = {}
): Promise<Response> {
	const { timeoutMs = 12000, toastOnError = true, retry } = opts;
	const action = retry ? { label: 'Retry', onClick: retry } : undefined;

	if (typeof navigator !== 'undefined' && navigator.onLine === false) {
		if (toastOnError)
			toast.error("You're offline", {
				description: 'Check your connection and try again.',
				action
			});
		throw new NetworkError('Device is offline.', 'offline');
	}

	const controller = new AbortController();
	const timer = setTimeout(() => controller.abort(), timeoutMs);
	try {
		return await fetch(input, { ...init, signal: init?.signal ?? controller.signal });
	} catch (e) {
		const timedOut = e instanceof DOMException && e.name === 'AbortError';
		if (toastOnError)
			toast.error(timedOut ? 'Request timed out' : 'Network problem', {
				description: timedOut
					? 'The connection is slow. Try again.'
					: 'Could not reach the server. Check your connection and try again.',
				action
			});
		throw new NetworkError(
			timedOut ? 'Request timed out.' : 'Network request failed.',
			timedOut ? 'timeout' : 'failed',
			{ cause: e }
		);
	} finally {
		clearTimeout(timer);
	}
}
